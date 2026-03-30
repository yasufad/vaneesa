// Package aggregator implements the third stage of the Vaneesa pipeline.
// A single goroutine reads ParsedPacket values, updates in-memory flow state,
// and every 1,000ms flushes a TrafficSnapshot to both the Detector and the
// Emitter.
//
// The Aggregator owns all in-memory flow state and is the only writer of it.
// The FlowService reads from it under a read lock when serving the frontend.
// Lock contention is low because the Aggregator only holds the write lock
// during the tick flush, not on every packet.
package aggregator

import (
	"context"
	"net"
	"sync"
	"sync/atomic"
	"time"

	"github.com/yasufad/vaneesa/internal/types"
)

// TickInterval is the aggregation window. One snapshot per second matches the
// frontend chart update rate and keeps storage writes predictable.
const TickInterval = time.Second

// FlowIdleTimeout is the duration after which a UDP (or other stateless) flow
// with no new packets is considered closed. TCP flows are closed on FIN/RST.
const FlowIdleTimeout = 60 * time.Second

// rateHistory is a fixed-size circular buffer of per-second packet counts for
// a single source IP. It is used by the Detector for rate spike calculations.
type rateHistory struct {
	counts [types.RollingWindowSize]uint64
	pos    int // next write position
	filled bool
}

// push adds a new count to the circular buffer and advances the write cursor.
func (r *rateHistory) push(count uint64) {
	r.counts[r.pos] = count
	r.pos = (r.pos + 1) % types.RollingWindowSize
	if r.pos == 0 {
		r.filled = true
	}
}

// average returns the mean packet count over the filled portion of the buffer.
// Returns 0.0 when no data has been recorded yet.
func (r *rateHistory) average() float64 {
	size := types.RollingWindowSize
	if !r.filled {
		size = r.pos
	}
	if size == 0 {
		return 0
	}
	var total uint64
	for i := 0; i < size; i++ {
		total += r.counts[i]
	}
	return float64(total) / float64(size)
}

// Aggregator accumulates ParsedPacket data and emits TrafficSnapshots.
type Aggregator struct {
	mu sync.RWMutex

	// Active flows indexed by FlowKey. The Aggregator is the sole writer.
	// FlowService reads under the read lock.
	flows map[types.FlowKey]*types.FlowRecord

	// Per-source-IP rolling packet rate history. Used by the Detector.
	rateHistory map[[16]byte]*rateHistory

	// Packet counters for the current interval (written without lock because
	// only the Aggregator goroutine updates them; FlowService never reads them).
	currentBytesIn    uint64
	currentBytesOut   uint64
	currentPacketsIn  uint64
	currentPacketsOut uint64
	protocolCounts    map[types.Protocol][2]uint64 // [bytes, packets]

	// Application-layer events collected during the current interval
	dnsEvents  []types.DNSEvent
	arpEvents  []types.ARPEvent
	dhcpEvents []types.DHCPEvent

	// Overflow drops counter shared with the Capture stage
	overflowDrops *atomic.Uint64

	// Session context
	sessionID int64
}

// New creates a ready-to-use Aggregator for the given session.
func New(sessionID int64, drops *atomic.Uint64) *Aggregator {
	return &Aggregator{
		flows:          make(map[types.FlowKey]*types.FlowRecord),
		rateHistory:    make(map[[16]byte]*rateHistory),
		protocolCounts: make(map[types.Protocol][2]uint64),
		overflowDrops:  drops,
		sessionID:      sessionID,
	}
}

// Run starts the aggregation loop. It blocks until ctx is cancelled and the
// in channel is drained. onSnapshot is called synchronously on each tick with
// the completed snapshot - the caller must not block inside this callback.
func (a *Aggregator) Run(
	ctx context.Context,
	in <-chan *types.ParsedPacket,
	onSnapshot func(*types.TrafficSnapshot),
) {
	ticker := time.NewTicker(TickInterval)
	defer ticker.Stop()

	var intervalStart = time.Now()

	for {
		select {
		case <-ctx.Done():
			// Drain the input channel so the Processor pool can exit cleanly.
			for range in {
			}
			return

		case pkt, ok := <-in:
			if !ok {
				// Channel closed - Processor pool has exited. Flush final snapshot.
				snap := a.flush(intervalStart, time.Now())
				onSnapshot(snap)
				return
			}
			a.accumulate(pkt)

		case t := <-ticker.C:
			snap := a.flush(intervalStart, t)
			intervalStart = t
			onSnapshot(snap)
		}
	}
}

// GetActiveFlows returns a copy of the in-memory flow table safe for the caller
// to iterate without holding the lock. This is called by FlowService.
func (a *Aggregator) GetActiveFlows() []types.FlowRecord {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make([]types.FlowRecord, 0, len(a.flows))
	for _, f := range a.flows {
		result = append(result, *f) // value copy - caller sees a snapshot
	}
	return result
}

// GetRateHistory returns a copy of the rolling rate history for a source IP.
// The map key is the raw 16-byte IP representation. Called by the Detector.
func (a *Aggregator) GetRateHistory() map[[16]byte]float64 {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make(map[[16]byte]float64, len(a.rateHistory))
	for ip, h := range a.rateHistory {
		result[ip] = h.average()
	}
	return result
}

//
// Internal - called only by the Aggregator goroutine
//

// accumulate updates in-memory state from a single ParsedPacket. No locking
// is required here because accumulate and flush are only ever called by the
// single Aggregator goroutine.
func (a *Aggregator) accumulate(pkt *types.ParsedPacket) {
	//
	// Determine traffic direction relative to this machine.
	// A simplistic heuristic: if srcIP is private-range, traffic is
	// outbound; otherwise it is inbound. This is good enough for
	// single-machine monitoring. Multi-subnet support can refine this.
	//
	outbound := isPrivateIP(pkt.SrcIP)

	bytes := uint64(pkt.WireLen)
	if outbound {
		a.currentBytesOut += bytes
		a.currentPacketsOut++
	} else {
		a.currentBytesIn += bytes
		a.currentPacketsIn++
	}

	// Protocol distribution
	c := a.protocolCounts[pkt.Protocol]
	c[0] += bytes
	c[1]++
	a.protocolCounts[pkt.Protocol] = c

	// Application-layer events
	if pkt.DNS != nil {
		a.dnsEvents = append(a.dnsEvents, *pkt.DNS)
	}
	if pkt.ARP != nil {
		a.arpEvents = append(a.arpEvents, *pkt.ARP)
	}
	if pkt.DHCP != nil {
		a.dhcpEvents = append(a.dhcpEvents, *pkt.DHCP)
	}

	// ARP packets have no flow to track
	if pkt.Protocol == types.ProtoARP {
		return
	}

	//
	// Flow tracking
	//
	if pkt.SrcIP == nil || pkt.DstIP == nil {
		return
	}

	key := types.NewFlowKey(pkt.SrcIP, pkt.DstIP, pkt.SrcPort, pkt.DstPort, pkt.Protocol)

	a.mu.Lock()
	flow, exists := a.flows[key]
	if !exists {
		flow = &types.FlowRecord{
			SessionID:  a.sessionID,
			Key:        key,
			SrcIP:      pkt.SrcIP,
			DstIP:      pkt.DstIP,
			SrcPort:    pkt.SrcPort,
			DstPort:    pkt.DstPort,
			Protocol:   pkt.Protocol,
			StartedAt:  pkt.Timestamp,
			LastSeenAt: pkt.Timestamp,
		}
		a.flows[key] = flow
	}

	flow.LastSeenAt = pkt.Timestamp

	if outbound {
		flow.BytesOut += bytes
		flow.PacketsOut++
	} else {
		flow.BytesIn += bytes
		flow.PacketsIn++
	}

	// TCP state machine - track SYN/FIN/RST for flow lifecycle
	if pkt.Protocol == types.ProtoTCP {
		if pkt.Flags.SYN && !pkt.Flags.ACK {
			flow.SYNSeen = true
		}
		if pkt.Flags.SYN && pkt.Flags.ACK {
			flow.SYNACKSeen = true
		}
		if pkt.Flags.FIN || pkt.Flags.RST {
			flow.Closed = true
		}
	}

	a.mu.Unlock()

	//
	// Per-source-IP rate history (for Detector)
	//
	// We count packets-per-source into the history at flush time, not
	// per-packet, so we accumulate the per-second count in a temporary
	// map. This avoids one map lookup + lock acquisition per packet.
	// (The map is reset in flush.)
}

// flush produces a TrafficSnapshot from the accumulated state, resets
// per-interval counters, and performs idle-flow expiry.
// Only called by the Aggregator goroutine; no lock needed on write fields.
func (a *Aggregator) flush(start, end time.Time) *types.TrafficSnapshot {
	snap := &types.TrafficSnapshot{
		IntervalStart: start,
		IntervalEnd:   end,
		BytesIn:       a.currentBytesIn,
		BytesOut:      a.currentBytesOut,
		PacketsIn:     a.currentPacketsIn,
		PacketsOut:    a.currentPacketsOut,
		DNSEvents:     a.dnsEvents,
		ARPEvents:     a.arpEvents,
		DHCPEvents:    a.dhcpEvents,
		OverflowDrops: a.overflowDrops.Load(),
	}

	// Protocol stats
	snap.ProtocolStats = make([]types.ProtocolStats, 0, len(a.protocolCounts))
	for proto, counts := range a.protocolCounts {
		snap.ProtocolStats = append(snap.ProtocolStats, types.ProtocolStats{
			Protocol: proto,
			Bytes:    counts[0],
			Packets:  counts[1],
		})
	}

	// Flow deltas and idle expiry - write lock for the duration of the scan
	a.mu.Lock()
	snap.FlowDeltas = make([]types.FlowDelta, 0, len(a.flows))
	now := end

	// Per-source-IP packet count for rate history
	srcPackets := make(map[[16]byte]uint64)

	for key, flow := range a.flows {
		delta := types.FlowDelta{
			Key:        key,
			BytesIn:    flow.BytesIn,
			BytesOut:   flow.BytesOut,
			PacketsIn:  flow.PacketsIn,
			PacketsOut: flow.PacketsOut,
		}

		// Count packets from this source for rate history
		srcPackets[key.SrcIP] += flow.PacketsOut

		// Remove flows that have been closed or idle too long
		if flow.Closed || now.Sub(flow.LastSeenAt) > FlowIdleTimeout {
			delta.Closed = true
			delete(a.flows, key)
		}

		snap.FlowDeltas = append(snap.FlowDeltas, delta)
	}

	// Update rate history for each source seen this interval
	for srcIP, count := range srcPackets {
		h, ok := a.rateHistory[srcIP]
		if !ok {
			h = &rateHistory{}
			a.rateHistory[srcIP] = h
		}
		h.push(count)
	}

	a.mu.Unlock()

	// Reset per-interval counters
	a.currentBytesIn = 0
	a.currentBytesOut = 0
	a.currentPacketsIn = 0
	a.currentPacketsOut = 0
	a.protocolCounts = make(map[types.Protocol][2]uint64)
	a.dnsEvents = a.dnsEvents[:0]
	a.arpEvents = a.arpEvents[:0]
	a.dhcpEvents = a.dhcpEvents[:0]

	return snap
}

//
// Network helpers
//

// privateRanges lists the RFC 1918 / RFC 4193 / loopback ranges considered
// "internal". Packets from these addresses are treated as outbound traffic.
// https://www.rfc-editor.org/rfc/rfc1918
// https://www.rfc-editor.org/rfc/rfc4193
var privateRanges = func() []*net.IPNet {
	cidrs := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
	}
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		_, n, err := net.ParseCIDR(c)
		if err == nil {
			nets = append(nets, n)
		}
	}
	return nets
}()

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	for _, n := range privateRanges {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}
