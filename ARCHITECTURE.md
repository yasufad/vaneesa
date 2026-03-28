# Vaneesa - Architecture

This document describes how Vaneesa is structured internally, why each decision was made, and what the constraints are. It is the reference point for anyone contributing to the codebase or trying to understand why something is the way it is.

---

## Overview

Vaneesa is a Wails v3 desktop application. Go handles everything that requires system access, packet capture, traffic aggregation, anomaly detection, session storage. TypeScript handle the visual layer. The Wails bridge connects them.

The split is intentional and clean. The frontend never touches raw packet data. The Go backend never concerns itself with how data is displayed. The bridge carries structured summaries, not raw frames.

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React / TypeScript)                                  │
│  Dashboard · Connections · Hosts · Protocols · Alerts · Sessions│
└───────────────────────┬─────────────────────────────────────────┘
                        │  Wails Bridge
                        │  bindings (RPC) + events (push)
┌───────────────────────▼─────────────────────────────────────────┐
│  Go Backend                                                     │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Capture  │→ │ Processor │→ │ Aggregator│→ │   Emitter   │  │
│  └──────────┘  └───────────┘  └───────────┘  └─────────────┘  │
│                                     │                           │
│                              ┌──────▼──────┐                   │
│                              │  Detector   │                    │
│                              └──────┬──────┘                   │
│                                     │                           │
│                              ┌──────▼──────┐                   │
│                              │   Storage   │                    │
│                              │  (SQLite)   │                    │
│                              └─────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Capture Pipeline

This is the core of Vaneesa. Everything else is downstream of it.

### Stage 1 - Capture

`gopacket` opens a handle on the selected interface via `libpcap` or `npcap`. The handle runs in its own goroutine, reading packets off the wire and pushing them onto a buffered channel.

```
pcap.Handle → chan gopacket.Packet
```

The channel buffer is sized to absorb bursts without dropping. If the downstream processor cannot keep up, packets are dropped at the channel boundary rather than at the capture layer - this is intentional. Dropping silently inside the capture goroutine would skew statistics; dropping at the channel gives us a measurable overflow counter.

A BPF filter is applied at the handle level if the user has configured one. By default, no filter is applied and all traffic is captured.

Promiscuous mode is off by default and toggle-able from the Settings view.

For PCAP replay, the same channel interface is used. The replay reader opens a `.pcap` file and feeds packets into the same channel at their original inter-packet timing (with an optional speed multiplier). The rest of the pipeline sees no difference.

### Stage 2 - Processor

A pool of goroutines reads from the packet channel and decodes each packet using `gopacket`'s lazy decoding. The processor extracts:

- Layer 3: source IP, destination IP, TTL
- Layer 4: protocol, source port, destination port, TCP flags
- Layer 7 (where identifiable without DPI): DNS queries and responses, ARP operations, DHCP events

Each decoded packet becomes a `ParsedPacket` struct - a small, flat representation with no reference to the original `gopacket` layers. This is important: gopacket's lazy decoding holds references to the original byte slice. If we keep those references alive, we pin the capture buffer in memory. By extracting only what we need into a flat struct, we let the original packet be collected immediately.

`ParsedPacket` is then forwarded to the Aggregator.

### Stage 3 - Aggregator

The Aggregator maintains in-memory state for the current second. Every 1,000ms a ticker fires, flushes the current bucket as a `TrafficSnapshot`, resets the counters, and forwards the snapshot both to the Emitter and to the Detector.

A `TrafficSnapshot` contains:

- Total bytes and packets in the interval, split by inbound/outbound
- Per-protocol byte and packet counts
- Per-flow deltas: for each active `FlowKey` (src IP, dst IP, src port, dst port, protocol), the bytes and packets added in this interval
- New flows opened in this interval
- Flows closed in this interval (tracked via TCP FIN/RST or a 60-second idle timeout for UDP)
- DNS events observed in this interval
- ARP events observed in this interval
- DHCP events observed in this interval

The Aggregator also maintains a rolling 60-second history of per-source-IP packet rates, used by the Detector.

### Stage 4 - Detector

The Detector receives each `TrafficSnapshot` and runs four checks:

**Rate spike detection** - for each source IP, compare the current second's packet rate against its 60-second rolling average. If the current rate exceeds 5× the average and the average itself is non-trivial (more than 10 packets/s), emit a `RateSpike` alert.

**Port scan detection** - maintain a per-source-IP set of distinct destination ports contacted in the last 10 seconds. If the set size exceeds 20, emit a `PortScan` alert. Reset the set after alerting to avoid repeat firing every second.

**SYN flood detection** - track SYN and SYN-ACK counts per source IP per second. If SYN/SYN-ACK ratio exceeds 10:1 with more than 50 SYNs in a second, emit a `SynFlood` alert.

**New host detection** - maintain a set of all MAC addresses observed since the session started. If a MAC is seen for the first time, emit a `NewHost` alert with the MAC and the IP it was first seen using.

All alerts are written to the Storage layer and forwarded to the Emitter.

Thresholds are configurable in Settings and stored in the database. Defaults are chosen to be useful for a typical office network; they will produce false positives on a busy segment and may need tuning.

### Stage 5 - Emitter

The Emitter receives `TrafficSnapshot` structs and alert events, batches them if necessary, and pushes them to the frontend via `app.Event.Emit`.

Two event types are emitted:

- `vaneesa:snapshot` - fired every second with the current `TrafficSnapshot`, serialised as JSON. The frontend uses this to update all live graphs and the connection table.
- `vaneesa:alert` - fired immediately when the Detector produces an alert. Does not wait for the next second boundary.

The Emitter is the only place in the backend that calls into Wails. Everything upstream of it is pure Go with no Wails dependency, which means the capture pipeline can be tested in isolation without the Wails runtime.

At high traffic volumes, a single `TrafficSnapshot` with hundreds of active flows can be several kilobytes. This is acceptable at 1 snapshot per second. If performance testing shows the WebView struggling to process updates, the Emitter will be changed to emit only flows that changed in the interval rather than all active flows.

---

## Services

Vaneesa exposes five Wails services. Each service is a Go struct with exported methods that become TypeScript bindings automatically.

### CaptureService

Manages the capture lifecycle.

```go
func (s *CaptureService) GetInterfaces() ([]InterfaceInfo, error)
func (s *CaptureService) StartCapture(iface string, filter string, promiscuous bool) error
func (s *CaptureService) StopCapture() error
func (s *CaptureService) CaptureStatus() CaptureStatus
func (s *CaptureService) LoadPCAP(path string) error
```

`StartCapture` starts the full pipeline - Capture → Processor → Aggregator → Detector → Emitter - and returns immediately. The pipeline runs in goroutines. `StopCapture` signals all goroutines to stop via context cancellation and waits for them to drain.

`ServiceStartup` on this service does nothing except verify that `libpcap`/`npcap` is present. If it is not, it returns an error that Wails surfaces as a startup failure, and the frontend shows a clear dependency error screen rather than an empty dashboard.

`ServiceShutdown` calls `StopCapture` if a capture is running.

### SessionService

Manages capture sessions - named, time-bounded collections of traffic data.

```go
func (s *SessionService) ListSessions() ([]SessionSummary, error)
func (s *SessionService) GetSession(id int64) (*Session, error)
func (s *SessionService) StartSession(name string) (int64, error)
func (s *SessionService) EndSession(id int64) error
func (s *SessionService) DeleteSession(id int64) error
func (s *SessionService) ExportCSV(id int64, path string) error
func (s *SessionService) ExportJSON(id int64, path string) error
```

A session is a row in the `sessions` table. The capture pipeline writes all flow records and alerts against the current session ID. Reviewing a past session means querying the database by session ID.

### FlowService

Serves connection and host data for the Connections and Hosts views. This is read-only - the frontend queries it, it does not push.

```go
func (s *FlowService) GetActiveFlows(page int, pageSize int) (*PagedFlows, error)
func (s *FlowService) GetFlowDetail(flowID int64) (*FlowDetail, error)
func (s *FlowService) GetTopTalkers(n int) ([]HostSummary, error)
func (s *FlowService) GetTopDestinations(n int) ([]DestinationSummary, error)
func (s *FlowService) GetHostDetail(ip string) (*HostDetail, error)
func (s *FlowService) GetAllHosts() ([]HostSummary, error)
```

Active flows come from in-memory state in the Aggregator, not from the database. Completed flows are persisted. `GetActiveFlows` merges both.

Pagination is enforced - `GetActiveFlows` will not return more than 500 rows per call. The frontend connection table uses virtual scrolling and requests pages on demand.

### AlertService

Serves alert data.

```go
func (s *AlertService) GetAlerts(sessionID int64, page int, pageSize int) (*PagedAlerts, error)
func (s *AlertService) GetAlert(id int64) (*Alert, error)
func (s *AlertService) AcknowledgeAlert(id int64) error
func (s *AlertService) GetUnacknowledgedCount() (int, error)
```

All alerts are also pushed via `vaneesa:alert` events in real time. The `AlertService` is for querying history and for the initial load when the frontend first renders.

### SettingsService

Stores and retrieves user configuration.

```go
func (s *SettingsService) GetSettings() (*Settings, error)
func (s *SettingsService) SaveSettings(settings Settings) error
func (s *SettingsService) GetDetectorThresholds() (*DetectorThresholds, error)
func (s *SettingsService) SaveDetectorThresholds(t DetectorThresholds) error
```

Settings are persisted in the database. The `SettingsService` is loaded during `ServiceStartup` and caches the current settings in memory so the Detector and Aggregator can read them without hitting the database on every tick.

---

## Storage

Vaneesa uses SQLite via `modernc.org/sqlite` - a pure Go SQLite driver that requires no CGo and no separate DLL. This simplifies cross-platform builds significantly.

The database file lives in the OS user data directory:
- Linux: `~/.local/share/vaneesa/vaneesa.db`
- macOS: `~/Library/Application Support/vaneesa/vaneesa.db`
- Windows: `%APPDATA%\vaneesa\vaneesa.db`

Schema migrations run automatically at startup using a simple sequential migration table. There is no ORM. Queries are written as plain SQL with `database/sql`.

### Core Tables

```sql
sessions        -- id, name, started_at, ended_at, interface, filter
flows           -- id, session_id, src_ip, dst_ip, src_port, dst_port,
                --   protocol, bytes_in, bytes_out, packets_in, packets_out,
                --   started_at, last_seen_at, closed
hosts           -- id, session_id, ip, mac, first_seen, last_seen, vendor
dns_queries     -- id, session_id, client_ip, query, qtype, response, ts
alerts          -- id, session_id, type, severity, src_ip, dst_ip,
                --   detail, acknowledged, ts
snapshots       -- id, session_id, ts, bytes_in, bytes_out,
                --   packets_in, packets_out, protocol_dist (JSON)
settings        -- key, value (key-value store for all config)
```

Snapshots are written every second during capture. A one-hour session at moderate traffic will write approximately 3,600 snapshot rows. Historical graphs for past sessions are reconstructed from the snapshot table.

The flow and host tables grow with traffic volume. There is no automatic pruning during a session. When a session is deleted, its rows are deleted from all tables.

---

## Frontend Structure

```
frontend/
  src/
    components/
      charts/         -- Recharts wrappers for time-series, protocol pie, etc.
      tables/         -- Connection table, host table, alert list
      shared/         -- Badge, severity indicator, IP tag, etc.
    views/
      Dashboard.tsx   -- Overview: bandwidth, top protocols, top hosts, recent alerts
      Connections.tsx -- Live flow table with virtual scroll
      Hosts.tsx       -- Discovered host list and host detail
      Protocols.tsx   -- Protocol distribution over time
      Alerts.tsx      -- Alert history with filters
      Sessions.tsx    -- Session management, PCAP import/export
      Settings.tsx    -- All configuration
    store/
      capture.ts      -- Zustand slice: capture status, current interface
      traffic.ts      -- Zustand slice: live snapshot data, rolling history
      alerts.ts       -- Zustand slice: unacknowledged count, recent alerts
      session.ts      -- Zustand slice: current session, session list
    events/
      index.ts        -- Registers all Wails event listeners, writes to Zustand store
    bindings/         -- Auto-generated by wails3 generate bindings
```

The `events/index.ts` file is the single place where Wails events are wired to the Zustand store. It is initialised once at app startup. Components never interact with the Wails event system directly - they read from Zustand, which is updated by the event handlers.

Wails bindings (RPC calls to Go services) are called directly from components or from Zustand actions, not wrapped in a separate layer. They are already typed from the auto-generation, so the extra wrapper would add nothing.

### Live Data Flow

```
Go Emitter → vaneesa:snapshot event
           → events/index.ts handler
           → Zustand traffic store
           → React components re-render
```

The entire chain from packet arriving to React re-render takes less than the 1-second aggregation interval. The bottleneck is intentionally the aggregation window, not the bridge or the render.

### Charts

Recharts is used for all time-series graphs. Each chart maintains a fixed-length rolling buffer in the Zustand store (120 entries = 2 minutes of history at 1 snapshot/second). When a new snapshot arrives, the oldest entry is shifted out and the new one pushed in. This is a constant-time operation regardless of session length.

TanStack Virtual handles the connection table. Rows are rendered only for the visible viewport. A session with 10,000 active flows renders at the same speed as one with 100.

---

## Concurrency Model

The Go backend has four long-running goroutines during an active capture:

1. **Capture goroutine** - reads packets from `pcap.Handle`, pushes to `packetChan`
2. **Processor goroutines** (pool of N, where N = `runtime.NumCPU()`) - read from `packetChan`, decode, push `ParsedPacket` to `parsedChan`
3. **Aggregator goroutine** - reads from `parsedChan`, accumulates state, fires on tick
4. **Detector goroutine** - receives snapshots from Aggregator, runs checks, emits alerts

All goroutines are tied to the capture context. When `StopCapture` is called, the context is cancelled, all goroutines observe `ctx.Done()`, drain their channels, and exit. `StopCapture` waits on a `sync.WaitGroup` before returning, so the caller knows the pipeline has fully stopped.

Shared mutable state - the Aggregator's in-memory flow table - is protected by a `sync.RWMutex`. The `FlowService.GetActiveFlows` method takes a read lock when serving the frontend. The Aggregator takes a write lock when updating. Lock contention here is low because the Aggregator only holds the write lock during the tick flush, not continuously.

---

## Privilege Handling

Raw packet capture requires elevated privileges. Vaneesa does not attempt to acquire privileges itself. Instead:

- On startup, `CaptureService.ServiceStartup` calls `pcap.FindAllDevs()`. If this fails with a permission error, the service returns an error.
- Wails surfaces the startup error, and the frontend displays a clear screen explaining what is needed and how to fix it (run as administrator on Windows, `sudo` or `CAP_NET_RAW` on Linux, no extra step on macOS for the primary interface).
- The rest of the application - session review, PCAP import, settings - is available even without capture privileges.

On Linux, the recommended approach is to set capabilities on the binary after build:

```bash
sudo setcap cap_net_raw,cap_net_admin=eip ./vaneesa
```

This avoids running the entire application as root.

---

## Platform Specifics

**Windows** - requires Npcap. The installer will check for Npcap and prompt the user to install it if absent. The application does not bundle Npcap.

**macOS** - `libpcap` is present by default. No extra dependencies. Code signing is required for distribution; the build pipeline handles this.

**Linux** - `libpcap-dev` must be installed for building. The runtime library (`libpcap.so`) must be present on the target machine. Most distributions include it. The build produces a dynamically linked binary; static linking against `libpcap` is not currently planned.

---

## Development and Testing

The capture pipeline is independent of Wails. `CaptureService` wraps it, but the pipeline structs - `Capture`, `Processor`, `Aggregator`, `Detector` - can be constructed and run in tests without a Wails application.

PCAP replay is the primary development mode. A small collection of reference PCAP files covering normal traffic, port scan patterns, and DNS activity is included in `testdata/`. Running Vaneesa in dev mode with a PCAP loaded does not require elevated privileges or a live interface.

```bash
# Standard dev mode (requires privileges for live capture)
wails3 dev

# Tests (no privileges required)
go test ./...
```

The frontend is developed directly against the live Go backend (`wails3 dev`). We build actual functionality step-by-step alongside the UI, avoiding simulated mock environments entirely.

---

## What is Not in Scope

These are deliberate exclusions, not oversights:

**Active scanning** - Vaneesa only observes traffic it sees passively. It does not send packets, run ARP probes, or perform port scans itself.

**Deep packet inspection** - Vaneesa identifies protocols by port and basic packet structure, not by inspecting payload content. It does not decode HTTP bodies, TLS handshakes beyond what is visible in metadata, or application-layer protocols beyond DNS.

**Centralised or agent-based monitoring** - Vaneesa is a single-machine tool. It monitors the interfaces on the machine it runs on. It does not have a server component or an agent model.

**Machine learning anomaly detection** - all anomaly detection is rule-based with configurable thresholds. This is a deliberate choice for transparency and predictability. A user should be able to read the threshold settings and understand exactly when an alert will fire.

**Traffic blocking or modification** - Vaneesa is read-only. It never writes packets to the network.
