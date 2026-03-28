# Vaneesa

Vaneesa is a desktop network monitoring tool. It captures live traffic on your network interfaces, tracks connections and hosts, and surfaces anomalies — port scans, traffic spikes, new devices, unexpected protocols in a dashboard you can actually read at a glance.

It is not Wireshark. It does not do deep packet inspection. It watches patterns, builds a picture of what is normal on your network, and tells you when something stops being normal.

---

## Why this exists

Wireshark is a microscope. Enterprise tools like PRTG require infrastructure and a licensing budget. GlassWire is aimed at home users and hides most of the interesting information. There is not much in between for someone who administers a small network or does blue team work and wants a local, zero-dependency dashboard that gives them real information without demanding that they already know what they are looking for.

Vaneesa is that tool.

---

## What it does

**Live traffic monitoring** - bandwidth and packet rates per interface, inbound/outbound split, protocol distribution in real time.

**Connection tracking** - every active flow with source, destination, port, protocol, bytes transferred, and duration. Sortable, filterable, clickable for detail.

**Host discovery** - devices are discovered passively from traffic. Per-host traffic profiles build up over a session. New, previously unseen devices surface as events.

**DNS and protocol visibility** - which domains are being resolved, which hosts are querying them, whether traffic on a given port matches the expected protocol.

**Anomaly detection** - four categories watched automatically: traffic rate spikes against a rolling average, port scans (one source, many distinct destination ports in a short window), SYN flood patterns, and new device appearances. All logged with timestamps and enough context to be actionable.

**Session management** - name and save capture sessions, review past sessions, import `.pcap` files for replay and analysis, export connection data as CSV or JSON.

---

## Platform requirements

Packet capture requires raw socket access, which means:

- **Linux / macOS** — `libpcap` must be installed. Most distributions include it or have it available via the package manager.
- **Windows** — [Npcap](https://npcap.com) must be installed separately. WinPcap is not supported.
- **Privileges** — Vaneesa needs to be run as root or with `CAP_NET_RAW` on Linux, as administrator on Windows. The UI will tell you clearly if it cannot open a capture handle.

If you do not have a live interface available or want to work without capture privileges, you can load a `.pcap` file from the Sessions screen instead. The entire UI works identically in replay mode.

---

## Architecture in brief

The Go backend captures packets, processes them through a pipeline of goroutines, and aggregates into one-second buckets before emitting state to the ui.

Capture, aggregation, anomaly detection, and storage are all separate stages. Adding a new anomaly detector or a new protocol analyser means touching one part of the pipeline without disturbing the rest.

Session data is stored locally in SQLite. Nothing leaves your machine.

---

## Project status

Planning phase. The product definition, architecture, and user flows are fully documented. The codebase has not yet been implemented. We are currently preparing to initialise the project and begin the first development phase.

---

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. The short version: discuss significant changes in an issue first, keep pull requests focused on one thing, and test on at least two platforms if you are touching the capture or storage layer.

---

## Licence

MIT. See `LICENCE`.
