// Package processor implements the second stage of the Vaneesa pipeline.
// A pool of goroutines reads gopacket.Packet values from the packet channel,
// decodes each one into a flat ParsedPacket, and forwards it to the Aggregator.
//
// The pool size defaults to runtime.NumCPU(). Packets are decoded
// independently, so there is no shared mutable state inside the pool; the only
// synchronisation is the channel boundary.
//
// gopacket lazy-decoding is used: layers are only materialised when accessed.
// After we have extracted everything we need into ParsedPacket, the gopacket
// layers are discarded so the underlying byte slice can be freed by the GC.
// This prevents the capture buffer from being pinned in memory indefinitely.
package processor

import (
	"context"
	"net"
	"runtime"
	"sync"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/yasufad/vaneesa/internal/types"
)

// Pool runs a fixed number of decoder goroutines. All goroutines share the
// same input channel; Go's scheduler distributes work between them without
// explicit load balancing.
type Pool struct {
	workers int
}

// New returns a Pool sized to the number of logical CPUs unless a specific
// count is requested. Passing 0 uses runtime.NumCPU().
func New(workers int) *Pool {
	if workers <= 0 {
		workers = runtime.NumCPU()
	}
	return &Pool{workers: workers}
}

// Run starts the worker goroutines. It blocks until ctx is cancelled and all
// workers have exited. It closes out when it exits so the Aggregator sees
// channel close as an EOF signal.
//
// in is closed by the Capture stage when it exits. Workers drain it fully
// before stopping so no packet is lost at the boundary.
func (p *Pool) Run(ctx context.Context, in <-chan gopacket.Packet, out chan<- *types.ParsedPacket) {
	var wg sync.WaitGroup
	wg.Add(p.workers)

	for i := 0; i < p.workers; i++ {
		go func() {
			defer wg.Done()
			worker(ctx, in, out)
		}()
	}

	wg.Wait()
	close(out)
}

// worker is the per-goroutine decode loop. It exits when in is drained or ctx
// is cancelled — whichever comes first. Checking ctx.Done() on every iteration
// would add overhead; instead we rely on the channel close from the Capture
// stage and the context-aware select in the hot path below.
func worker(ctx context.Context, in <-chan gopacket.Packet, out chan<- *types.ParsedPacket) {
	for {
		select {
		case <-ctx.Done():
			// Drain remaining packets so the channel buffer is cleared and the
			// Capture stage can complete its own shutdown without blocking.
			for range in {
			}
			return
		case pkt, ok := <-in:
			if !ok {
				return
			}
			parsed := decode(pkt)
			if parsed == nil {
				continue // packet could not be decoded at all — skip
			}
			// Forward to Aggregator. This send is blocking: if the Aggregator
			// falls behind, back-pressure propagates up to the Capture stage
			// which then counts overflows. We do not drop here.
			select {
			case out <- parsed:
			case <-ctx.Done():
				return
			}
		}
	}
}

//
// Packet decoding
//

// decode extracts a ParsedPacket from a gopacket.Packet. It returns nil for
// packets that carry no information useful to the pipeline (e.g., pure padding
// frames or packets with no network layer).
func decode(pkt gopacket.Packet) *types.ParsedPacket {
	meta := pkt.Metadata()

	p := &types.ParsedPacket{
		Timestamp: meta.Timestamp,
		WireLen:   uint32(meta.Length),
	}

	// ----------------------------------------------------------------
	// Link layer — Ethernet (and loopback on some platforms)
	// ----------------------------------------------------------------
	if eth := pkt.Layer(layers.LayerTypeEthernet); eth != nil {
		e := eth.(*layers.Ethernet)
		// HardwareAddr.String() allocates. Copy raw bytes instead.
		p.SrcMAC = cloneMAC(e.SrcMAC)
		p.DstMAC = cloneMAC(e.DstMAC)

		// ARP lives entirely at the Ethernet / link layer. Handle it here
		// before the network-layer switch so we can return early.
		if arp := pkt.Layer(layers.LayerTypeARP); arp != nil {
			a := arp.(*layers.ARP)
			p.Protocol = types.ProtoARP
			p.ARP = &types.ARPEvent{
				Operation: types.ARPOperation(a.Operation),
				SenderMAC: cloneMAC(net.HardwareAddr(a.SourceHwAddress)),
				SenderIP:  cloneIP(a.SourceProtAddress),
				TargetMAC: cloneMAC(net.HardwareAddr(a.DstHwAddress)),
				TargetIP:  cloneIP(a.DstProtAddress),
			}
			p.SrcIP = p.ARP.SenderIP
			p.DstIP = p.ARP.TargetIP
			return p
		}
	}

	// ----------------------------------------------------------------
	// Network layer — IPv4 or IPv6
	// ----------------------------------------------------------------
	if ip4 := pkt.Layer(layers.LayerTypeIPv4); ip4 != nil {
		v4 := ip4.(*layers.IPv4)
		p.SrcIP = cloneIP(v4.SrcIP)
		p.DstIP = cloneIP(v4.DstIP)
		p.TTL = v4.TTL
	} else if ip6 := pkt.Layer(layers.LayerTypeIPv6); ip6 != nil {
		v6 := ip6.(*layers.IPv6)
		p.SrcIP = cloneIP(v6.SrcIP)
		p.DstIP = cloneIP(v6.DstIP)
		p.TTL = v6.HopLimit
	} else {
		// No recognisable network layer — nothing useful to aggregate.
		return nil
	}

	// ----------------------------------------------------------------
	// Transport layer
	// ----------------------------------------------------------------
	switch {
	case pkt.Layer(layers.LayerTypeTCP) != nil:
		tcp := pkt.Layer(layers.LayerTypeTCP).(*layers.TCP)
		p.Protocol = types.ProtoTCP
		p.SrcPort = uint16(tcp.SrcPort)
		p.DstPort = uint16(tcp.DstPort)
		p.Flags = types.TCPFlags{
			SYN: tcp.SYN,
			ACK: tcp.ACK,
			FIN: tcp.FIN,
			RST: tcp.RST,
		}
		p.PayloadLen = uint32(len(tcp.Payload))

		// DNS over TCP (zone transfers, large responses). Standard port 53.
		if (p.SrcPort == 53 || p.DstPort == 53) && len(tcp.Payload) > 2 {
			if dns := decodeDNS(pkt, p.SrcIP, p.DstIP); dns != nil {
				p.DNS = dns
			}
		}

	case pkt.Layer(layers.LayerTypeUDP) != nil:
		udp := pkt.Layer(layers.LayerTypeUDP).(*layers.UDP)
		p.Protocol = types.ProtoUDP
		p.SrcPort = uint16(udp.SrcPort)
		p.DstPort = uint16(udp.DstPort)
		p.PayloadLen = uint32(len(udp.Payload))

		// DNS over UDP — standard port 53.
		if p.SrcPort == 53 || p.DstPort == 53 {
			if dns := decodeDNS(pkt, p.SrcIP, p.DstIP); dns != nil {
				p.DNS = dns
			}
		}
		// DHCP over UDP — port 67 (server) or 68 (client).
		if p.SrcPort == 67 || p.SrcPort == 68 || p.DstPort == 67 || p.DstPort == 68 {
			if dhcp := decodeDHCP(pkt); dhcp != nil {
				p.DHCP = dhcp
			}
		}

	case pkt.Layer(layers.LayerTypeICMPv4) != nil:
		p.Protocol = types.ProtoICMP
		if icmp := pkt.Layer(layers.LayerTypeICMPv4); icmp != nil {
			icmpLayer := icmp.(*layers.ICMPv4)
			p.PayloadLen = uint32(len(icmpLayer.Payload))
		}

	case pkt.Layer(layers.LayerTypeICMPv6) != nil:
		p.Protocol = types.ProtoICMPv6
		if icmp := pkt.Layer(layers.LayerTypeICMPv6); icmp != nil {
			icmpLayer := icmp.(*layers.ICMPv6)
			p.PayloadLen = uint32(len(icmpLayer.Payload))
		}

	default:
		p.Protocol = types.ProtoOther
	}

	return p
}

//
// Application-layer decoders
//

// decodeDNS extracts a DNSEvent from a packet known to carry DNS traffic.
// Returns nil if the DNS layer is absent or malformed.
func decodeDNS(pkt gopacket.Packet, srcIP, dstIP net.IP) *types.DNSEvent {
	dnsLayer := pkt.Layer(layers.LayerTypeDNS)
	if dnsLayer == nil {
		return nil
	}
	dns := dnsLayer.(*layers.DNS)

	ev := &types.DNSEvent{
		IsResponse: dns.QR, // QR=1 means response; QR=0 means query
	}

	if dns.QR {
		// Response: server is srcIP, client is dstIP
		ev.ServerIP = cloneIP(srcIP)
		ev.ClientIP = cloneIP(dstIP)
	} else {
		// Query: client is srcIP, server is dstIP
		ev.ClientIP = cloneIP(srcIP)
		ev.ServerIP = cloneIP(dstIP)
	}

	if len(dns.Questions) > 0 {
		q := dns.Questions[0]
		ev.QueryName = string(q.Name)
		ev.QType = types.DNSQueryType(q.Type)
	}

	if dns.QR {
		ev.Answers = make([]string, 0, len(dns.Answers))
		for _, ans := range dns.Answers {
			switch {
			case ans.IP != nil:
				ev.Answers = append(ev.Answers, ans.IP.String())
			case len(ans.CNAME) > 0:
				ev.Answers = append(ev.Answers, string(ans.CNAME))
			case len(ans.PTR) > 0:
				ev.Answers = append(ev.Answers, string(ans.PTR))
			}
		}
	}

	return ev
}

// decodeDHCP extracts a DHCPEvent from a packet known to carry DHCP traffic.
// Returns nil if the DHCP layer is absent or is a DHCPv6 packet (not yet
// supported — DHCPv6 has a different gopacket layer type).
func decodeDHCP(pkt gopacket.Packet) *types.DHCPEvent {
	dhcpLayer := pkt.Layer(layers.LayerTypeDHCPv4)
	if dhcpLayer == nil {
		return nil
	}
	dhcp := dhcpLayer.(*layers.DHCPv4)

	ev := &types.DHCPEvent{
		ClientMAC: cloneMAC(net.HardwareAddr(dhcp.ClientHWAddr)),
		ClientIP:  cloneIP(dhcp.YourClientIP),
		ServerIP:  cloneIP(dhcp.NextServerIP),
	}

	// Parse DHCP options to extract message type, hostname, and lease time.
	// Options are defined in RFC 2132. https://www.rfc-editor.org/rfc/rfc2132
	for _, opt := range dhcp.Options {
		switch opt.Type {
		case layers.DHCPOptMessageType:
			if len(opt.Data) == 1 {
				ev.MessageType = types.DHCPMessageType(opt.Data[0])
			}
		case layers.DHCPOptHostname:
			ev.Hostname = string(opt.Data)
		case layers.DHCPOptLeaseTime:
			if len(opt.Data) == 4 {
				ev.LeaseSecs = uint32(opt.Data[0])<<24 |
					uint32(opt.Data[1])<<16 |
					uint32(opt.Data[2])<<8 |
					uint32(opt.Data[3])
			}
		}
	}

	return ev
}

//
// Memory helpers — copy slices out of gopacket buffers
//

// cloneIP returns a copy of ip that does not share the underlying gopacket
// byte buffer. Necessary because gopacket reuses buffers in NoCopy mode.
func cloneIP(ip net.IP) net.IP {
	if ip == nil {
		return nil
	}
	out := make(net.IP, len(ip))
	copy(out, ip)
	return out
}

// cloneMAC returns a copy of mac that does not share the underlying gopacket
// byte buffer.
func cloneMAC(mac net.HardwareAddr) net.HardwareAddr {
	if mac == nil {
		return nil
	}
	out := make(net.HardwareAddr, len(mac))
	copy(out, mac)
	return out
}
