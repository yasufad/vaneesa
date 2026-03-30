// Package types defines the shared domain types used throughout the Vaneesa
// capture pipeline. No package outside of types may define these structs to
// prevent circular imports and ensure a single source of truth for the data
// model that flows from the wire to the UI.
package types

import (
	"net"
	"time"
)

//
// Layer-decoded packet representation
//

// RollingWindowSize is the number of one-second intervals retained for rolling
// average calculations. 60 seconds matches the architecture specification.
// Both the Aggregator and Detector use this constant to size their history buffers.
const RollingWindowSize = 60

// Protocol represents a network protocol type (TCP, UDP, ICMP, etc.).
type Protocol uint8

const (
	ProtoUnknown Protocol = 0
	ProtoTCP     Protocol = 1
	ProtoUDP     Protocol = 2
	ProtoICMP    Protocol = 3
	ProtoICMPv6  Protocol = 4
	ProtoARP     Protocol = 5
	ProtoOther   Protocol = 255
)

// String returns a human-readable name for the protocol.
func (p Protocol) String() string {
	switch p {
	case ProtoTCP:
		return "TCP"
	case ProtoUDP:
		return "UDP"
	case ProtoICMP:
		return "ICMP"
	case ProtoICMPv6:
		return "ICMPv6"
	case ProtoARP:
		return "ARP"
	default:
		return "Other"
	}
}

// TCPFlags holds the boolean state of each TCP control bit extracted from a
// single packet. SYN, ACK, FIN, RST are the only ones Vaneesa cares about.
type TCPFlags struct {
	SYN bool
	ACK bool
	FIN bool
	RST bool
}

// ParsedPacket is the flat, self-contained struct produced by the Processor
// goroutine pool for every packet it decodes. It contains only the fields
// needed by the Aggregator and Detector; all gopacket layer references have
// been discarded so the original capture buffer can be freed immediately.
//
// Fields are value types (not pointers) to keep the struct allocation cheap
// and avoid GC pressure at high packet rates.
type ParsedPacket struct {
	// Timestamp is the capture time reported by libpcap/npcap. For PCAP
	// replay this is the original capture timestamp from the file.
	Timestamp time.Time

	// Network layer
	SrcIP net.IP
	DstIP net.IP
	TTL   uint8

	// Transport layer
	Protocol Protocol
	SrcPort  uint16
	DstPort  uint16
	Flags    TCPFlags

	// Link layer (may be zero for loopback or tunnel interfaces)
	SrcMAC net.HardwareAddr
	DstMAC net.HardwareAddr

	// Payload size in bytes, excluding headers. Used for byte accounting.
	PayloadLen uint32

	// Wire size in bytes, including all headers. Matches pcap's captured length.
	WireLen uint32

	// Application-layer events extracted without DPI. Only one of these will
	// be set per packet; most packets produce no application event at all.
	DNS  *DNSEvent  // non-nil for DNS query/response packets
	ARP  *ARPEvent  // non-nil for ARP request/reply packets
	DHCP *DHCPEvent // non-nil for DHCP packets
}

//
// Application-layer event types (set on ParsedPacket)
//

// DNSQueryType mirrors the IANA-assigned numeric type codes for DNS record
// types. Only the common ones are named; the rest arrive as their raw uint16.
type DNSQueryType uint16

const (
	DNSTypeA     DNSQueryType = 1
	DNSTypeAAAA  DNSQueryType = 28
	DNSTypeMX    DNSQueryType = 15
	DNSTypeCNAME DNSQueryType = 5
	DNSTypePTR   DNSQueryType = 12
	DNSTypeTXT   DNSQueryType = 16
)

// DNSEvent captures a single DNS query or response observed on the wire.
// Responses may carry multiple answers; the Answers slice holds them all.
type DNSEvent struct {
	ClientIP   net.IP
	ServerIP   net.IP
	QueryName  string
	QType      DNSQueryType
	IsResponse bool
	// Answers is populated only for responses. Each entry is an address
	// or CNAME string as returned by the resolver.
	Answers []string
}

// ARPOperation distinguishes ARP request from reply.
type ARPOperation uint16

const (
	ARPRequest ARPOperation = 1
	ARPReply   ARPOperation = 2
)

// ARPEvent captures a single ARP message. This is how Vaneesa discovers
// host-to-MAC mappings passively without sending any probes.
type ARPEvent struct {
	Operation ARPOperation
	SenderMAC net.HardwareAddr
	SenderIP  net.IP
	TargetMAC net.HardwareAddr
	TargetIP  net.IP
}

// DHCPMessageType mirrors the DHCP option 53 values from RFC 2132 §9.6.
// https://www.rfc-editor.org/rfc/rfc2132#section-9.6
type DHCPMessageType uint8

const (
	DHCPDiscover DHCPMessageType = 1
	DHCPOffer    DHCPMessageType = 2
	DHCPRequest  DHCPMessageType = 3
	DHCPDecline  DHCPMessageType = 4
	DHCPAck      DHCPMessageType = 5
	DHCPNak      DHCPMessageType = 6
	DHCPRelease  DHCPMessageType = 7
	DHCPInform   DHCPMessageType = 8
)

// DHCPEvent captures a DHCP message. ACK events are the most useful because
// they confirm a device has been assigned an IP and carry the lease duration.
type DHCPEvent struct {
	MessageType DHCPMessageType
	ClientMAC   net.HardwareAddr
	ClientIP    net.IP // offered/acked address; zero for Discover
	ServerIP    net.IP
	Hostname    string // from option 12, if present
	LeaseSecs   uint32 // from option 51, if present
}

//
// Flow tracking
//

// FlowKey uniquely identifies a bidirectional TCP/UDP flow. The key is
// directional: src < dst ordering is NOT normalised. Two packets in opposite
// directions of the same conversation produce different FlowKeys. The
// Aggregator normalises them into a single FlowRecord.
//
// net.IP is a slice and therefore not hashable directly. FlowKey uses fixed
// 16-byte arrays to remain usable as a map key without hashing overhead.
// IPv4 addresses are stored as IPv4-in-IPv6 form (16 bytes with leading
// 0xff 0xff prefix), exactly as returned by net.IP.To16().
type FlowKey struct {
	SrcIP    [16]byte
	DstIP    [16]byte
	SrcPort  uint16
	DstPort  uint16
	Protocol Protocol
}

// NewFlowKey constructs a FlowKey from net.IP values. It calls To16() so
// IPv4 and IPv4-mapped-IPv6 addresses compare as equal.
func NewFlowKey(srcIP, dstIP net.IP, srcPort, dstPort uint16, proto Protocol) FlowKey {
	var k FlowKey
	copy(k.SrcIP[:], srcIP.To16())
	copy(k.DstIP[:], dstIP.To16())
	k.SrcPort = srcPort
	k.DstPort = dstPort
	k.Protocol = proto
	return k
}

// FlowRecord is the in-memory representation of a tracked connection.
// It accumulates totals across all packets belonging to the flow within
// the current session.
type FlowRecord struct {
	ID        int64 // Database row ID once persisted; 0 until first write
	SessionID int64
	Key       FlowKey
	SrcIP     net.IP
	DstIP     net.IP
	SrcPort   uint16
	DstPort   uint16
	Protocol  Protocol

	// Counters — updated by the Aggregator on each tick
	BytesIn    uint64
	BytesOut   uint64
	PacketsIn  uint64
	PacketsOut uint64

	// Lifecycle
	StartedAt  time.Time
	LastSeenAt time.Time
	Closed     bool // set when TCP FIN/RST seen or idle timeout triggered

	// TCP state tracking
	SYNSeen    bool
	SYNACKSeen bool
}

// FlowDelta carries per-flow changes within a single aggregation interval.
// It is a lightweight struct used inside TrafficSnapshot to avoid copying the
// full FlowRecord for every active flow on every tick.
type FlowDelta struct {
	Key        FlowKey
	BytesIn    uint64
	BytesOut   uint64
	PacketsIn  uint64
	PacketsOut uint64
	// NewFlow is true when this flow was first seen in this interval.
	NewFlow bool
	// Closed is true when the flow transitioned to closed in this interval.
	Closed bool
}

//
// Aggregated snapshot emitted every second
//

// ProtocolStats holds aggregated counts for a single protocol within one
// aggregation interval.
type ProtocolStats struct {
	Protocol Protocol
	Bytes    uint64
	Packets  uint64
}

// TrafficSnapshot is the complete state summary produced by the Aggregator at
// the end of each 1-second interval. It is the primary data structure carried
// from the Go backend to the Emitter (and ultimately the frontend).
//
// The snapshot is designed to be serialisable directly to JSON without loss
// of information. net.IP and net.HardwareAddr fields are serialised as strings.
type TrafficSnapshot struct {
	// Interval boundaries
	IntervalStart time.Time
	IntervalEnd   time.Time

	// Aggregate traffic totals for this interval
	BytesIn    uint64
	BytesOut   uint64
	PacketsIn  uint64
	PacketsOut uint64

	// Per-protocol breakdown for this interval
	ProtocolStats []ProtocolStats

	// Per-flow changes in this interval. The Emitter sends the full list;
	// the frontend merges deltas into its local flow table.
	FlowDeltas []FlowDelta

	// Events extracted from application-layer traffic in this interval
	DNSEvents  []DNSEvent
	ARPEvents  []ARPEvent
	DHCPEvents []DHCPEvent

	// OverflowDrops is the number of packets dropped at the channel
	// boundary because the Processor could not keep up. Non-zero values
	// indicate the system is under more load than the pipeline can handle.
	OverflowDrops uint64
}

//
// Host tracking
//

// HostRecord represents a device discovered passively from traffic.
type HostRecord struct {
	ID        int64
	SessionID int64
	IP        net.IP
	MAC       net.HardwareAddr
	// Vendor is the OUI lookup result for the MAC address. Empty if the
	// OUI is not in the embedded lookup table.
	Vendor    string
	FirstSeen time.Time
	LastSeen  time.Time

	// Traffic totals accumulated across the session
	BytesIn    uint64
	BytesOut   uint64
	PacketsIn  uint64
	PacketsOut uint64
}

//
// Alerts
//

// AlertType classifies which detector rule produced an alert.
type AlertType string

const (
	AlertRateSpike AlertType = "rate_spike"
	AlertPortScan  AlertType = "port_scan"
	AlertSYNFlood  AlertType = "syn_flood"
	AlertNewHost   AlertType = "new_host"
)

// AlertSeverity conveys urgency for display and filtering.
type AlertSeverity string

const (
	SeverityInfo     AlertSeverity = "info"
	SeverityWarning  AlertSeverity = "warning"
	SeverityCritical AlertSeverity = "critical"
)

// Alert is produced by the Detector and written to storage. The Detail field
// carries a human-readable English description suitable for direct display.
type Alert struct {
	ID           int64
	SessionID    int64
	Type         AlertType
	Severity     AlertSeverity
	SrcIP        net.IP
	DstIP        net.IP // may be nil for alerts that do not have a single destination
	Detail       string
	Acknowledged bool
	Timestamp    time.Time
}

//
// Sessions
//

// CaptureMode distinguishes between a live capture and a PCAP replay session.
type CaptureMode string

const (
	CaptureLive   CaptureMode = "live"
	CaptureReplay CaptureMode = "replay"
)

// Session represents a named, time-bounded monitoring session.
type Session struct {
	ID          int64
	Name        string
	Mode        CaptureMode
	Interface   string // empty for PCAP replay sessions
	Filter      string // BPF filter expression; empty means no filter
	PCAPPath    string // path to source file for replay sessions
	StartedAt   time.Time
	EndedAt     *time.Time // nil while the session is active
	Promiscuous bool
}

// SessionSummary is a lightweight projection of Session used in list views
// to avoid loading per-flow data just to render a session list row.
type SessionSummary struct {
	ID         int64
	Name       string
	Mode       CaptureMode
	Interface  string
	StartedAt  time.Time
	EndedAt    *time.Time
	FlowCount  int64
	AlertCount int64
	TotalBytes uint64
}

//
// Settings and thresholds
//

// DetectorThresholds holds the configurable parameters for each anomaly
// detector. All values have sensible defaults; users tune them from Settings.
type DetectorThresholds struct {
	// RateSpike: multiplier above the rolling average to trigger.
	// Default: 5 (i.e., current rate > 5× 60s average).
	RateSpikeMultiplier float64

	// RateSpike: minimum rolling average in packets/s before the detector
	// fires. Prevents alerts on low-traffic hosts where small absolute
	// changes appear as large relative spikes.
	// Default: 10
	RateSpikeMinBaseline float64

	// PortScan: distinct destination ports within the sliding window to trigger.
	// Default: 20
	PortScanDistinctPorts int

	// PortScan: sliding window duration in seconds.
	// Default: 10
	PortScanWindowSecs int

	// SYNFlood: minimum SYN count per second before the ratio check fires.
	// Default: 50
	SYNFloodMinSYNs int

	// SYNFlood: SYN-to-SYN-ACK ratio to trigger.
	// Default: 10 (10:1 means 10 SYNs per SYN-ACK)
	SYNFloodRatio float64
}

// DefaultDetectorThresholds returns the out-of-the-box threshold values
// documented in ARCHITECTURE.md. These are calibrated for a typical office
// network; a busy segment or a home lab may need adjustment.
func DefaultDetectorThresholds() DetectorThresholds {
	return DetectorThresholds{
		RateSpikeMultiplier:   5.0,
		RateSpikeMinBaseline:  10.0,
		PortScanDistinctPorts: 20,
		PortScanWindowSecs:    10,
		SYNFloodMinSYNs:       50,
		SYNFloodRatio:         10.0,
	}
}

// Settings holds all user-configurable application preferences.
type Settings struct {
	// Display preferences
	DarkMode        bool
	ShowGeolocation bool

	// Capture defaults
	DefaultInterface string
	DefaultFilter    string
	Promiscuous      bool

	// Anomaly detection
	Thresholds DetectorThresholds
}

// DefaultSettings returns factory defaults. DarkMode is true because Vaneesa
// is dark-first by product design.
func DefaultSettings() Settings {
	return Settings{
		DarkMode:        true,
		ShowGeolocation: true,
		Thresholds:      DefaultDetectorThresholds(),
	}
}

//
// Interface discovery
//

// InterfaceInfo describes a network interface available for capture.
type InterfaceInfo struct {
	Name        string
	Description string // populated on Windows; empty on Linux/macOS
	Addresses   []net.IP
	IsLoopback  bool
	IsUp        bool
}

//
// Capture status
//

// CaptureState describes the current lifecycle state of the capture pipeline.
type CaptureState string

const (
	StateIdle     CaptureState = "idle"
	StateStarting CaptureState = "starting"
	StateRunning  CaptureState = "running"
	StateStopping CaptureState = "stopping"
	StateError    CaptureState = "error"
)

// CaptureStatus is the snapshot of pipeline state returned by
// CaptureService.CaptureStatus(). It is polled by the frontend on startup and
// kept up to date via vaneesa:status events during a capture.
type CaptureStatus struct {
	State         CaptureState
	Mode          CaptureMode
	Interface     string
	SessionID     int64
	SessionName   string
	OverflowDrops uint64
	ErrorMessage  string // populated only when State == StateError
}

//
// Pagination helpers used by the service layer
//

// PagedFlows is the paginated response for FlowService.GetActiveFlows.
type PagedFlows struct {
	Flows      []FlowRecord
	TotalCount int64
	Page       int
	PageSize   int
}

// PagedAlerts is the paginated response for AlertService.GetAlerts.
type PagedAlerts struct {
	Alerts     []Alert
	TotalCount int64
	Page       int
	PageSize   int
}

// HostSummary is a lightweight projection used for top-talkers lists.
type HostSummary struct {
	IP        net.IP
	BytesIn   uint64
	BytesOut  uint64
	FlowCount int64
}

// DestinationSummary is a lightweight projection for top-destinations lists.
type DestinationSummary struct {
	IP        net.IP
	BytesIn   uint64
	BytesOut  uint64
	FlowCount int64
}
