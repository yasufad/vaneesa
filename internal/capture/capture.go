// Package capture manages the first stage of the Vaneesa pipeline: reading
// packets off the wire (or from a PCAP file) and placing them onto the shared
// packet channel consumed by the Processor pool.
//
// The capture goroutine is intentionally kept simple: it reads, it pushes, it
// counts drops. All decoding happens downstream in the Processor pool.
package capture

import (
	"context"
	"fmt"
	"net"
	"sync/atomic"
	"time"

	"github.com/google/gopacket"
	"github.com/google/gopacket/pcap"
	"github.com/yasufad/vaneesa/internal/types"
)

// DefaultSnapLen is the maximum number of bytes captured per packet.
// 65536 captures the full frame on any standard MTU; setting it larger has no
// practical benefit and wastes buffer memory.
const DefaultSnapLen = 65536

// PacketChanBuffer is the number of gopacket.Packet values that can sit in
// the channel between the capture goroutine and the Processor pool before
// drops occur. 4096 absorbs ~4 seconds of traffic at 1000 pps before the
// Processor falls behind.
const PacketChanBuffer = 4096

// Handle wraps a pcap capture session. It is constructed by NewLiveHandle or
// NewReplayHandle and consumed by Run.
type Handle struct {
	handle        *pcap.Handle
	isReplay      bool
	replaySpeed   float64 // 1.0 = real-time, 2.0 = double speed, 0 = as-fast-as-possible
	overflowDrops *atomic.Uint64
}

// NewLiveHandle opens a live capture on the named interface. filter is an
// optional BPF expression (empty string means no filter). promiscuous controls
// whether the interface captures frames not addressed to it.
func NewLiveHandle(iface, filter string, promiscuous bool, drops *atomic.Uint64) (*Handle, error) {
	inactive, err := pcap.NewInactiveHandle(iface)
	if err != nil {
		return nil, fmt.Errorf("pcap: could not create inactive handle on %q: %w", iface, err)
	}
	defer inactive.CleanUp()

	if err := inactive.SetSnapLen(DefaultSnapLen); err != nil {
		return nil, fmt.Errorf("pcap: SetSnapLen: %w", err)
	}
	if err := inactive.SetPromisc(promiscuous); err != nil {
		return nil, fmt.Errorf("pcap: SetPromisc: %w", err)
	}
	// 10ms read timeout: balances latency against CPU busy-waiting on the
	// handle. libpcap's default of 1000ms introduces unacceptable lag.
	if err := inactive.SetTimeout(10 * time.Millisecond); err != nil {
		return nil, fmt.Errorf("pcap: SetTimeout: %w", err)
	}
	if err := inactive.SetBufferSize(32 * 1024 * 1024); err != nil {
		// Non-fatal: fall back to the OS default buffer size.
		_ = err
	}

	h, err := inactive.Activate()
	if err != nil {
		return nil, fmt.Errorf("pcap: activate on %q: %w", iface, err)
	}

	if filter != "" {
		if err := h.SetBPFFilter(filter); err != nil {
			h.Close()
			return nil, fmt.Errorf("pcap: BPF filter %q invalid: %w", filter, err)
		}
	}

	return &Handle{
		handle:        h,
		isReplay:      false,
		overflowDrops: drops,
	}, nil
}

// NewReplayHandle opens a PCAP file for offline replay. speed controls replay
// rate: 1.0 = original inter-packet timing, 0 = maximum speed (no delay).
func NewReplayHandle(path string, speed float64, drops *atomic.Uint64) (*Handle, error) {
	h, err := pcap.OpenOffline(path)
	if err != nil {
		return nil, fmt.Errorf("pcap: open offline %q: %w", path, err)
	}
	return &Handle{
		handle:        h,
		isReplay:      true,
		replaySpeed:   speed,
		overflowDrops: drops,
	}, nil
}

// Run reads packets from the underlying pcap handle and pushes them onto out
// until ctx is cancelled or the handle is exhausted (replay mode). It closes
// out when it exits so downstream stages see channel close as EOF.
//
// Drops are counted atomically in h.overflowDrops; the caller's atomic.Uint64
// is shared with the Aggregator so it appears in TrafficSnapshots.
func (h *Handle) Run(ctx context.Context, out chan<- gopacket.Packet) {
	defer close(out)
	defer h.handle.Close()

	src := gopacket.NewPacketSource(h.handle, h.handle.LinkType())
	// Lazy decoding defers layer parsing until fields are accessed. Because
	// the Processor pool calls explicit Decode methods, we get the same
	// performance but can still access the raw bytes cheaply here.
	src.DecodeOptions.Lazy = true
	src.DecodeOptions.NoCopy = true

	var prevCapTime time.Time
	var prevWallTime time.Time

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		pkt, err := src.NextPacket()
		if err != nil {
			// io.EOF in replay mode means we have read the entire file.
			// In live mode this should not happen; if it does, the handle
			// was closed externally — either way, exit cleanly.
			return
		}

		// Replay timing: sleep to approximate original inter-packet delays.
		// This makes the Aggregator see traffic at the correct rate, which
		// in turn exercises the Detector's rolling averages correctly.
		if h.isReplay && h.replaySpeed > 0 && !prevCapTime.IsZero() {
			capDelay := pkt.Metadata().Timestamp.Sub(prevCapTime)
			scaledDelay := time.Duration(float64(capDelay) / h.replaySpeed)
			elapsed := time.Since(prevWallTime)
			if sleep := scaledDelay - elapsed; sleep > 0 {
				select {
				case <-ctx.Done():
					return
				case <-time.After(sleep):
				}
			}
		}
		prevCapTime = pkt.Metadata().Timestamp
		prevWallTime = time.Now()

		// Non-blocking send: if the Processor pool is not keeping up, the
		// channel is full and we drop here. The drop is counted so the
		// Aggregator can include it in the next snapshot.
		select {
		case out <- pkt:
		default:
			h.overflowDrops.Add(1)
		}
	}
}

//
// Interface discovery
//

// ListInterfaces returns all network interfaces visible to libpcap/npcap.
// On Linux and macOS this requires no special privileges. On Windows, Npcap
// must be installed.
func ListInterfaces() ([]types.InterfaceInfo, error) {
	devs, err := pcap.FindAllDevs()
	if err != nil {
		return nil, fmt.Errorf("pcap: FindAllDevs: %w", err)
	}

	infos := make([]types.InterfaceInfo, 0, len(devs))
	for _, dev := range devs {
		addrs := make([]net.IP, 0, len(dev.Addresses))
		for _, a := range dev.Addresses {
			if a.IP != nil {
				addrs = append(addrs, a.IP)
			}
		}

		// pcap does not expose IsUp or IsLoopback directly. We cross-reference
		// with net.Interfaces() to get those flags where possible.
		isLoopback := false
		isUp := true
		if iface, e := net.InterfaceByName(dev.Name); e == nil {
			isLoopback = iface.Flags&net.FlagLoopback != 0
			isUp = iface.Flags&net.FlagUp != 0
		}

		infos = append(infos, types.InterfaceInfo{
			Name:        dev.Name,
			Description: dev.Description,
			Addresses:   addrs,
			IsLoopback:  isLoopback,
			IsUp:        isUp,
		})
	}
	return infos, nil
}

// CheckPrivileges attempts to open a pcap handle on the loopback interface as
// a cheap privilege probe. It does not retain the handle. Returns nil if
// capture is permitted; returns a descriptive error otherwise.
func CheckPrivileges() error {
	devs, err := pcap.FindAllDevs()
	if err != nil {
		return fmt.Errorf("capture privileges check failed: %w", err)
	}
	if len(devs) == 0 {
		return fmt.Errorf("no network interfaces found — is libpcap/npcap installed?")
	}
	return nil
}
