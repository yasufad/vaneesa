// Package detector implements the fourth stage of the Vaneesa pipeline.
// It receives TrafficSnapshot values from the Aggregator and runs four
// independent anomaly checks on each. Alerts are emitted via a callback so
// the Detector has no dependency on storage or the Emitter directly — those
// concerns are handled by the pipeline orchestrator.
//
// All detector state is owned by a single Detector instance and is only
// mutated from the Run goroutine, so no locking is required inside this
// package.
package detector

import (
	"fmt"
	"net"
	"time"

	"github.com/yasufad/vaneesa/internal/types"
)

// Detector holds state for all four anomaly detectors. A new instance must be
// created for each capture session to ensure state isolation.
type Detector struct {
	thresholds types.DetectorThresholds
	sessionID  int64

	// PortScan state — per source IP, a time-bucketed set of destination ports.
	// Each bucket covers PortScanWindowSecs seconds; we keep two buckets so the
	// current and previous windows can be merged for the full sliding window.
	portScanBuckets     [2]*portScanBucket
	portScanBucketIdx   int
	portScanBucketStart time.Time

	// SYNFlood state — per source IP, SYN and SYN-ACK counts for the current second.
	synCounts    map[[16]byte]uint64
	synAckCounts map[[16]byte]uint64

	// NewHost state — set of all MAC addresses observed since session start.
	// MACs are stored as fixed 6-byte arrays to be usable as map keys.
	knownMACs map[[6]byte]bool

	// Rate history is read from the Aggregator via the snapshot — we receive
	// the pre-computed per-second packet counts per source IP in the flow deltas.
	// We maintain our own per-IP 60s rolling averages here to remain independent.
	rateHistory map[[16]byte]*rollingAvg
}

// portScanBucket holds a set of (srcIP → distinct dstPorts) observations
// within a single time window bucket.
type portScanBucket struct {
	start time.Time
	// ports maps srcIP → set of distinct dstPorts seen in this bucket
	ports map[[16]byte]map[uint16]bool
}

func newPortScanBucket(start time.Time) *portScanBucket {
	return &portScanBucket{
		start: start,
		ports: make(map[[16]byte]map[uint16]bool),
	}
}

// rollingAvg maintains a circular buffer of per-second values for computing a
// rolling mean. Used independently inside the Detector for rate spike checks.
type rollingAvg struct {
	values [types.RollingWindowSize]float64
	pos    int
	filled bool
}

func (r *rollingAvg) push(v float64) {
	r.values[r.pos] = v
	r.pos = (r.pos + 1) % len(r.values)
	if r.pos == 0 {
		r.filled = true
	}
}

func (r *rollingAvg) mean() float64 {
	size := len(r.values)
	if !r.filled {
		size = r.pos
	}
	if size == 0 {
		return 0
	}
	var sum float64
	for i := 0; i < size; i++ {
		sum += r.values[i]
	}
	return sum / float64(size)
}

// New creates a Detector for a new capture session with the given thresholds.
func New(sessionID int64, thresholds types.DetectorThresholds) *Detector {
	now := time.Now()
	return &Detector{
		thresholds:          thresholds,
		sessionID:           sessionID,
		portScanBuckets:     [2]*portScanBucket{newPortScanBucket(now), nil},
		portScanBucketStart: now,
		synCounts:           make(map[[16]byte]uint64),
		synAckCounts:        make(map[[16]byte]uint64),
		knownMACs:           make(map[[6]byte]bool),
		rateHistory:         make(map[[16]byte]*rollingAvg),
	}
}

// Analyse runs all four detectors against a single TrafficSnapshot. Any alerts
// generated are passed to onAlert. This method is synchronous and is expected
// to be called from the Aggregator's callback, keeping the pipeline sequential.
func (d *Detector) Analyse(snap *types.TrafficSnapshot, onAlert func(*types.Alert)) {
	// Reset per-second TCP flag counters before processing this snapshot
	d.synCounts = make(map[[16]byte]uint64)
	d.synAckCounts = make(map[[16]byte]uint64)

	// Walk flow deltas to accumulate per-source statistics used by multiple detectors
	for _, delta := range snap.FlowDeltas {
		d.updatePortScan(snap.IntervalEnd, delta, onAlert)
		d.updateRateHistory(delta)
	}

	// Rate spike — runs per source IP after rate history is updated
	d.checkRateSpikes(snap, onAlert)

	// SYN flood — accumulate from ARP/DNS/flow data; we need raw TCP counts.
	// The flow deltas do not carry per-packet flag counts, so we derive a
	// heuristic: new flows with only outbound packets and no inbound response
	// within this interval are likely to be SYN-only. For accurate SYN counts,
	// the Aggregator exports them directly in the snapshot's flow deltas via
	// the SYNSeen/SYNACKSeen fields on FlowRecord — we extend FlowDelta here
	// by processing the full snapshot context.
	d.checkSYNFlood(snap, onAlert)

	// New host — scan ARP events and DHCP events for previously unseen MACs
	d.checkNewHosts(snap, onAlert)
}

//
// Rate spike detector
//

func (d *Detector) updateRateHistory(delta types.FlowDelta) {
	// Use outbound packets as the rate metric — this catches sources that are
	// sending large volumes, which is the primary signal for rate spikes.
	var srcKey [16]byte
	copy(srcKey[:], delta.Key.SrcIP[:])

	avg, ok := d.rateHistory[srcKey]
	if !ok {
		avg = &rollingAvg{}
		d.rateHistory[srcKey] = avg
	}
	avg.push(float64(delta.PacketsOut))
}

func (d *Detector) checkRateSpikes(snap *types.TrafficSnapshot, onAlert func(*types.Alert)) {
	for srcKey, avg := range d.rateHistory {
		baseline := avg.mean()
		if baseline < d.thresholds.RateSpikeMinBaseline {
			continue // not enough history or too low volume to be meaningful
		}

		// Current rate is the most recently pushed value
		var current float64
		if avg.filled || avg.pos > 0 {
			lastPos := avg.pos - 1
			if lastPos < 0 {
				lastPos = len(avg.values) - 1
			}
			current = avg.values[lastPos]
		}

		if current > baseline*d.thresholds.RateSpikeMultiplier {
			ip := net.IP(srcKey[:])
			onAlert(&types.Alert{
				SessionID: d.sessionID,
				Type:      types.AlertRateSpike,
				Severity:  types.SeverityWarning,
				SrcIP:     ip,
				Detail: fmt.Sprintf(
					"Traffic rate spike from %s: %.0f pps (%.1f× 60s average of %.0f pps)",
					ip, current, current/baseline, baseline,
				),
				Timestamp: snap.IntervalEnd,
			})
		}
	}
}

//
// Port scan detector
//

func (d *Detector) updatePortScan(
	now time.Time,
	delta types.FlowDelta,
	onAlert func(*types.Alert),
) {
	windowDur := time.Duration(d.thresholds.PortScanWindowSecs) * time.Second

	// Rotate bucket if the current window has expired
	if now.Sub(d.portScanBucketStart) >= windowDur {
		// The old current becomes the previous; start a fresh current.
		d.portScanBuckets[1] = d.portScanBuckets[0]
		d.portScanBuckets[0] = newPortScanBucket(now)
		d.portScanBucketStart = now
	}

	current := d.portScanBuckets[0]
	var srcKey [16]byte
	copy(srcKey[:], delta.Key.SrcIP[:])

	if current.ports[srcKey] == nil {
		current.ports[srcKey] = make(map[uint16]bool)
	}
	current.ports[srcKey][delta.Key.DstPort] = true

	// Count distinct ports across both buckets (sliding window)
	distinct := len(current.ports[srcKey])
	if prev := d.portScanBuckets[1]; prev != nil {
		for p := range prev.ports[srcKey] {
			distinct++ // count ports from previous bucket not in current
			_ = p      // we just need the set size, not dedup here
		}
		// Accurate dedup: merge both sets
		merged := make(map[uint16]bool, len(current.ports[srcKey]))
		for p := range current.ports[srcKey] {
			merged[p] = true
		}
		for p := range prev.ports[srcKey] {
			merged[p] = true
		}
		distinct = len(merged)
	}

	if distinct >= d.thresholds.PortScanDistinctPorts {
		ip := net.IP(srcKey[:])
		onAlert(&types.Alert{
			SessionID: d.sessionID,
			Type:      types.AlertPortScan,
			Severity:  types.SeverityWarning,
			SrcIP:     ip,
			Detail: fmt.Sprintf(
				"Possible port scan from %s: %d distinct destination ports in %ds window",
				ip, distinct, d.thresholds.PortScanWindowSecs,
			),
			Timestamp: now,
		})

		// Reset the source's port sets to avoid re-firing on every subsequent second
		delete(current.ports, srcKey)
		if d.portScanBuckets[1] != nil {
			delete(d.portScanBuckets[1].ports, srcKey)
		}
	}
}

//
// SYN flood detector
//

// checkSYNFlood derives SYN and SYN-ACK counts from the flow deltas. New flows
// (delta.NewFlow == true) that are TCP and outbound-only (no inbound response)
// are counted as probable SYN-only exchanges.
//
// This is a heuristic: a more precise implementation would require the
// Aggregator to forward per-source SYN and SYN-ACK raw counts. The current
// approach avoids adding extra fields to TrafficSnapshot while still catching
// obvious SYN floods.
func (d *Detector) checkSYNFlood(snap *types.TrafficSnapshot, onAlert func(*types.Alert)) {
	// Tally SYN approximations from flow deltas
	synApprox := make(map[[16]byte]uint64)
	synAckApprox := make(map[[16]byte]uint64)

	for _, delta := range snap.FlowDeltas {
		if delta.Key.Protocol != types.ProtoTCP {
			continue
		}
		var srcKey [16]byte
		copy(srcKey[:], delta.Key.SrcIP[:])

		if delta.NewFlow && delta.PacketsIn == 0 {
			// New flow with no inbound response — likely a unanswered SYN
			synApprox[srcKey] += delta.PacketsOut
		} else if delta.PacketsIn > 0 && delta.PacketsOut > 0 {
			// Bidirectional — SYN-ACK was received
			synAckApprox[srcKey]++
		}
	}

	for srcKey, syns := range synApprox {
		if syns < uint64(d.thresholds.SYNFloodMinSYNs) {
			continue
		}
		synAcks := synAckApprox[srcKey]
		if synAcks == 0 {
			synAcks = 1 // avoid division by zero; ratio still fires
		}
		ratio := float64(syns) / float64(synAcks)

		if ratio >= d.thresholds.SYNFloodRatio {
			ip := net.IP(srcKey[:])
			onAlert(&types.Alert{
				SessionID: d.sessionID,
				Type:      types.AlertSYNFlood,
				Severity:  types.SeverityCritical,
				SrcIP:     ip,
				Detail: fmt.Sprintf(
					"Possible SYN flood from %s: %d unanswered SYNs (%.1f:1 ratio)",
					ip, syns, ratio,
				),
				Timestamp: snap.IntervalEnd,
			})
		}
	}
}

//
// New host detector
//

func (d *Detector) checkNewHosts(snap *types.TrafficSnapshot, onAlert func(*types.Alert)) {
	// Check ARP events — most reliable source of MAC→IP mappings
	for _, ev := range snap.ARPEvents {
		if ev.SenderMAC == nil || len(ev.SenderMAC) < 6 {
			continue
		}
		var mac [6]byte
		copy(mac[:], ev.SenderMAC)

		if !d.knownMACs[mac] {
			d.knownMACs[mac] = true
			onAlert(&types.Alert{
				SessionID: d.sessionID,
				Type:      types.AlertNewHost,
				Severity:  types.SeverityInfo,
				SrcIP:     ev.SenderIP,
				Detail: fmt.Sprintf(
					"New device: MAC %s first seen at IP %s",
					ev.SenderMAC, ev.SenderIP,
				),
				Timestamp: snap.IntervalEnd,
			})
		}
	}

	// Also check DHCP ACK events — catches devices that do not send ARP probes
	for _, ev := range snap.DHCPEvents {
		if ev.MessageType != types.DHCPAck {
			continue
		}
		if ev.ClientMAC == nil || len(ev.ClientMAC) < 6 {
			continue
		}
		var mac [6]byte
		copy(mac[:], ev.ClientMAC)

		if !d.knownMACs[mac] {
			d.knownMACs[mac] = true
			name := ev.Hostname
			if name == "" {
				name = "unknown"
			}
			onAlert(&types.Alert{
				SessionID: d.sessionID,
				Type:      types.AlertNewHost,
				Severity:  types.SeverityInfo,
				SrcIP:     ev.ClientIP,
				Detail: fmt.Sprintf(
					"New device via DHCP: MAC %s assigned IP %s (hostname: %s)",
					ev.ClientMAC, ev.ClientIP, name,
				),
				Timestamp: snap.IntervalEnd,
			})
		}
	}
}
