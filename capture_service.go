package main

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/gopacket"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yasufad/vaneesa/internal/aggregator"
	"github.com/yasufad/vaneesa/internal/capture"
	"github.com/yasufad/vaneesa/internal/db"
	"github.com/yasufad/vaneesa/internal/detector"
	"github.com/yasufad/vaneesa/internal/processor"
	"github.com/yasufad/vaneesa/internal/types"
)

// CaptureService manages the packet capture pipeline lifecycle and exposes
// control methods to the frontend. It orchestrates the four pipeline stages:
// Capture → Processor → Aggregator → Detector, and emits snapshots to the
// frontend via Wails events.
type CaptureService struct {
	app      *application.App
	database *db.DB

	mu            sync.RWMutex
	state         types.CaptureState
	mode          types.CaptureMode
	sessionID     int64
	sessionName   string
	iface         string
	overflowDrops atomic.Uint64
	errorMessage  string

	// Pipeline cancellation
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewCaptureService creates a CaptureService ready to start captures.
func NewCaptureService(app *application.App, database *db.DB) *CaptureService {
	return &CaptureService{
		app:      app,
		database: database,
		state:    types.StateIdle,
	}
}

// GetInterfaces returns all network interfaces available for capture.
func (s *CaptureService) GetInterfaces() ([]types.InterfaceInfo, error) {
	return capture.ListInterfaces()
}

// StartCapture begins a live capture session on the specified interface.
// filter is an optional BPF expression; promiscuous controls whether to
// capture all traffic on the segment or only traffic addressed to this host.
func (s *CaptureService) StartCapture(sessionName, iface, filter string, promiscuous bool) error {
	s.mu.Lock()
	if s.state != types.StateIdle {
		s.mu.Unlock()
		return fmt.Errorf("capture already running or starting")
	}
	s.state = types.StateStarting
	s.mu.Unlock()

	// Create session in database
	session := &types.Session{
		Name:        sessionName,
		Mode:        types.CaptureLive,
		Interface:   iface,
		Filter:      filter,
		Promiscuous: promiscuous,
	}
	sessionID, err := s.database.InsertSession(session)
	if err != nil {
		s.mu.Lock()
		s.state = types.StateError
		s.errorMessage = fmt.Sprintf("failed to create session: %v", err)
		s.mu.Unlock()
		return err
	}

	s.mu.Lock()
	s.sessionID = sessionID
	s.sessionName = sessionName
	s.iface = iface
	s.mode = types.CaptureLive
	s.overflowDrops.Store(0)
	s.mu.Unlock()

	// Start pipeline in background
	go s.runPipeline(iface, filter, promiscuous)

	return nil
}

// StopCapture stops the active capture session and waits for the pipeline
// to drain cleanly.
func (s *CaptureService) StopCapture() error {
	s.mu.Lock()
	if s.state != types.StateRunning {
		s.mu.Unlock()
		return fmt.Errorf("no capture running")
	}
	s.state = types.StateStopping
	sessionID := s.sessionID
	s.mu.Unlock()

	// Signal pipeline to stop
	if s.cancel != nil {
		s.cancel()
	}

	// Wait for all goroutines to exit
	s.wg.Wait()

	// Mark session as ended
	if err := s.database.EndSession(sessionID, time.Now()); err != nil {
		// Log but don't fail - session is already stopped
		_ = err
	}

	s.mu.Lock()
	s.state = types.StateIdle
	s.sessionID = 0
	s.sessionName = ""
	s.iface = ""
	s.mu.Unlock()

	// Emit final status to frontend
	s.app.Event.Emit("vaneesa:status", s.CaptureStatus())

	return nil
}

// CaptureStatus returns the current pipeline state for the frontend to poll.
func (s *CaptureService) CaptureStatus() types.CaptureStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return types.CaptureStatus{
		State:         s.state,
		Mode:          s.mode,
		Interface:     s.iface,
		SessionID:     s.sessionID,
		SessionName:   s.sessionName,
		OverflowDrops: s.overflowDrops.Load(),
		ErrorMessage:  s.errorMessage,
	}
}

// GetLatestSnapshot returns a placeholder TrafficSnapshot. This method exists
// solely to force Wails to generate TypeScript bindings for TrafficSnapshot
// and ProtocolStats. The frontend receives real snapshots via vaneesa:snapshot
// events during capture; this method is not intended for production use.
func (s *CaptureService) GetLatestSnapshot() *types.TrafficSnapshot {
	return &types.TrafficSnapshot{
		IntervalStart: time.Now(),
		IntervalEnd:   time.Now(),
		ProtocolStats: []types.ProtocolStats{},
	}
}

// runPipeline starts all four pipeline stages and blocks until context
// cancellation or an error occurs.
func (s *CaptureService) runPipeline(iface, filter string, promiscuous bool) {
	ctx, cancel := context.WithCancel(context.Background())
	s.cancel = cancel
	defer cancel()

	// Open capture handle
	handle, err := capture.NewLiveHandle(iface, filter, promiscuous, &s.overflowDrops)
	if err != nil {
		s.mu.Lock()
		s.state = types.StateError
		s.errorMessage = fmt.Sprintf("failed to open capture: %v", err)
		s.mu.Unlock()
		// Emit error status to frontend so the UI can display the error
		s.app.Event.Emit("vaneesa:status", s.CaptureStatus())
		return
	}

	// Create channels
	packetChan := make(chan gopacket.Packet, capture.PacketChanBuffer)
	parsedChan := make(chan *types.ParsedPacket, 1024)

	// Start Capture stage
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		handle.Run(ctx, packetChan)
	}()

	// Start Processor pool
	proc := processor.New(0) // 0 = use runtime.NumCPU()
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		proc.Run(ctx, packetChan, parsedChan)
	}()

	// Start Aggregator
	agg := aggregator.New(s.sessionID, &s.overflowDrops)
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		agg.Run(ctx, parsedChan, func(snap *types.TrafficSnapshot) {
			s.onSnapshot(snap, agg)
		})
	}()

	s.mu.Lock()
	s.state = types.StateRunning
	s.mu.Unlock()

	// Emit initial status
	s.app.Event.Emit("vaneesa:status", s.CaptureStatus())

	// Wait for cancellation
	<-ctx.Done()
}

// onSnapshot is called by the Aggregator on each 1-second tick. It runs the
// Detector, persists data to the database, and emits the snapshot to the frontend.
func (s *CaptureService) onSnapshot(snap *types.TrafficSnapshot, agg *aggregator.Aggregator) {
	fmt.Printf("[DEBUG] onSnapshot called: BytesIn=%d BytesOut=%d\n", snap.BytesIn, snap.BytesOut)

	// Run anomaly detection
	thresholds, err := s.database.GetSettings()
	if err != nil {
		// Use defaults if settings cannot be loaded
		def := types.DefaultSettings()
		thresholds = &def
	}

	det := detector.New(s.sessionID, thresholds.Thresholds)
	det.Analyse(snap, func(alert *types.Alert) {
		// Persist alert
		if _, err := s.database.InsertAlert(alert); err != nil {
			// Log but don't fail the pipeline
			_ = err
		}
		// Emit alert to frontend
		s.app.Event.Emit("vaneesa:alert", alert)
	})

	// Persist snapshot
	if err := s.database.InsertSnapshot(s.sessionID, snap); err != nil {
		// Log but don't fail the pipeline
		_ = err
	}

	// Persist flows - get active flows from aggregator and upsert to database
	flows := agg.GetActiveFlows()
	for i := range flows {
		if _, err := s.database.UpsertFlow(&flows[i]); err != nil {
			// Log but don't fail the pipeline
			_ = err
		}
	}

	// Persist hosts - extract from ARP events and flows
	hostMap := make(map[string]*types.HostRecord)

	// Extract hosts from ARP events (provides MAC addresses)
	for _, arp := range snap.ARPEvents {
		if arp.SenderIP != nil {
			key := arp.SenderIP.String()
			if _, exists := hostMap[key]; !exists {
				hostMap[key] = &types.HostRecord{
					SessionID: s.sessionID,
					IP:        arp.SenderIP,
					MAC:       arp.SenderMAC,
					FirstSeen: snap.IntervalStart,
					LastSeen:  snap.IntervalEnd,
				}
			}
		}
	}

	// Extract hosts from flows (provides traffic stats)
	for i := range flows {
		f := &flows[i]

		// Source host
		if f.SrcIP != nil {
			key := f.SrcIP.String()
			host, exists := hostMap[key]
			if !exists {
				host = &types.HostRecord{
					SessionID: s.sessionID,
					IP:        f.SrcIP,
					FirstSeen: f.StartedAt,
					LastSeen:  f.LastSeenAt,
				}
				hostMap[key] = host
			}
			host.BytesOut += f.BytesOut
			host.PacketsOut += f.PacketsOut
			if f.LastSeenAt.After(host.LastSeen) {
				host.LastSeen = f.LastSeenAt
			}
		}

		// Destination host
		if f.DstIP != nil {
			key := f.DstIP.String()
			host, exists := hostMap[key]
			if !exists {
				host = &types.HostRecord{
					SessionID: s.sessionID,
					IP:        f.DstIP,
					FirstSeen: f.StartedAt,
					LastSeen:  f.LastSeenAt,
				}
				hostMap[key] = host
			}
			host.BytesIn += f.BytesIn
			host.PacketsIn += f.PacketsIn
			if f.LastSeenAt.After(host.LastSeen) {
				host.LastSeen = f.LastSeenAt
			}
		}
	}

	// Upsert all discovered hosts
	for _, host := range hostMap {
		if err := s.database.UpsertHost(host); err != nil {
			// Log but don't fail the pipeline
			_ = err
		}
	}

	// Emit snapshot to frontend
	fmt.Printf("[DEBUG] Emitting snapshot event to frontend\n")
	s.app.Event.Emit("vaneesa:snapshot", snap)
}
