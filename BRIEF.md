# Vaneesa — Product Definition

Let me think through this properly before a single line of code is considered.

## What is Vaneesa?

Vaneesa is a **real-time network intelligence dashboard for the desktop**. It sits on your machine, watches your network interfaces, and gives you a clear, organised, living picture of what is happening on your network — right now, and over time.

It is not a packet inspector. It is not a protocol analyser. It is not a firewall. It is a **monitoring and awareness tool** — the difference between looking out a window at traffic versus reading a raw sensor log.

The name should feel like a proper product, not a utility. Vaneesa has opinions about what matters and presents information clearly, without demanding expertise to interpret it.

---

## Who is Vaneesa For?

There are three clear user archetypes:

**The Network Administrator** — managing a small to medium business network. They need to know what is consuming bandwidth, which devices are talking to unusual destinations, and whether something is behaving strangely. They do not have time to run Wireshark on every machine.

**The Security Analyst / Blue Teamer** — actively monitoring for threats. They need rapid anomaly detection, port scan alerts, unusual traffic patterns, and a clear audit trail. They want the tool to surface what matters rather than drowning them in raw data.

**The Technical Enthusiast / Student** — learning networking or running a home lab. They want something approachable that teaches them what is actually happening on their network without needing to understand BPF filters before they see anything useful.

---

## The Problem Vaneesa Solves

Existing tools fall into one of two failure modes:

**Too raw** — Wireshark gives you everything but interprets nothing. It is a microscope, not a dashboard. Reading it in real-time monitoring mode is exhausting and requires deep expertise.

**Too heavy or expensive** — PRTG, SolarWinds, and similar enterprise tools require server infrastructure, licensing fees, and significant configuration before they become useful. They are built for large organisations with dedicated IT teams.

There is a genuine gap for something that:
- Installs and runs immediately with zero infrastructure
- Provides a clear, readable view of network activity out of the box
- Surfaces anomalies without requiring manual rule configuration
- Works for a single machine or a small network equally well

Vaneesa fills that gap.

---

## What Vaneesa Does — Core Capabilities

### 1. Live Traffic Monitoring
The heartbeat of the product. Real-time graphs of bandwidth usage, packet rates, and protocol distribution across selected interfaces. You open Vaneesa and immediately see the network breathing.

- Packets per second and bytes per second
- Per-interface breakdown when multiple interfaces are active
- Protocol distribution (TCP, UDP, ICMP, DNS, ARP, and so on)
- Inbound vs outbound separation

### 2. Connection Tracking
A live table of active network flows — every meaningful conversation happening on the network. This is where you find the unexpected.

- Source and destination IP, ports, protocol
- Bytes transferred and duration per connection
- Top talkers by volume
- Top destinations — both internal and external
- Geolocation of external IPs (country and city level)
- Reverse DNS resolution where available

### 3. Host Discovery and Profiling
Vaneesa builds a picture of devices it sees on the network over time.

- Automatically discovered hosts with MAC addresses
- Per-host traffic summary (bandwidth consumed, connections made)
- First seen and last seen timestamps
- Detection of new, previously unseen devices — surfaced as an event
- ARP table visibility

### 4. Protocol Intelligence
Understanding what protocols are being used and whether that matches expectations.

- DNS query tracking — what domains are being resolved, by which hosts
- HTTP host visibility (where applicable)
- DHCP lease events — new devices joining the network
- Detection of unexpected protocols on standard ports (e.g. non-HTTP traffic on port 80)

### 5. Anomaly Detection and Alerting
Vaneesa watches for behaviour that warrants attention and surfaces it clearly without flooding the user.

- **Traffic spikes** — a source or destination suddenly consuming significantly more bandwidth than its rolling average
- **Port scanning** — a single source contacting many distinct ports within a short window
- **SYN floods** — abnormal ratio of SYN packets to established connections
- **New device alerts** — an unrecognised MAC address appearing on the network
- **Unusual protocol alerts** — traffic on ports that should not carry it
- All alerts carry a severity level, a timestamp, and enough context to act on

Alerts are visible in the interface but also logged persistently so you can review what happened during a session you were not watching.

### 6. Session Management
Vaneesa supports working with data across time, not just right now.

- **Live capture sessions** — start, name, and stop a monitoring session
- **Session history** — review past sessions with their recorded data
- **PCAP import** — replay and analyse a pre-captured packet file exactly as if it were live traffic (essential for testing and post-incident review)
- **PCAP export** — save the raw packets from a session for further analysis in other tools
- **Data export** — export connection tables and alert logs as CSV or JSON

### 7. Interface and Filter Control
Power users need control without it getting in the way of everyone else.

- Select which network interface or interfaces to monitor
- Toggle promiscuous mode (to see all traffic on a segment, not just traffic addressed to your machine)
- Optional BPF filter input for users who know what they want to narrow down
- All of the above accessible but not required to get started

---

## The Key Views / Screens

**Dashboard** — The landing view. High-level overview of bandwidth, packet rate, top protocols, top hosts, and the most recent alerts. This is what you look at most of the time.

**Connections** — The live flow table. Filterable and sortable. Click a row to see detail about that specific connection.

**Hosts** — All discovered devices. Click a host to see its traffic profile, connections, and any alerts associated with it.

**Protocols** — Breakdown of network activity by protocol over time. Good for understanding the character of your traffic.

**Alerts** — The full alert history for the current session and past sessions. Filterable by severity, type, and time.

**Sessions** — Manage your capture history, import PCAPs, export data.

**Settings** — Interface selection, alert thresholds, filter preferences, display preferences.

---

## UX Philosophy

**Dark-first.** Network monitoring tools are used in environments where dark interfaces reduce eye strain and feel natural.

**Dashboard-first.** You land on a meaningful view, not a configuration wizard. Pick an interface and you are seeing data within seconds.

**Progressive disclosure.** The overview is clean. Depth is available when you want it — click into a host, a connection, an alert — but it is never forced on you.

**Alerts that inform, not overwhelm.** Vaneesa is opinionated about what is worth surfacing. It does not throw every packet anomaly at you. It surfaces patterns that a competent human would find notable.

**No infrastructure required.** Vaneesa runs entirely on your machine. No server, no database to configure, no cloud dependency. Install it and it works.

---

## What Vaneesa is Not

- It is not Wireshark. It does not replace deep packet inspection. It surfaces patterns and points you toward where to look.
- It is not an IDS/IPS. It detects anomalies but does not block traffic or replace a proper intrusion detection system.
- It is not a network mapper. It discovers hosts it sees traffic from, but it is not running active scans.
- It is not an enterprise SIEM. It is a desktop tool for individuals and small teams, not a centralised logging platform.

---

## How Vaneesa is Different

| | Wireshark | PRTG / SolarWinds | GlassWire | **Vaneesa** |
|---|---|---|---|---|
| Setup | Install & run | Server + configuration | Install & run | Install & run |
| Primary view | Raw packets | Infrastructure metrics | Per-app usage | Network flow intelligence |
| Target user | Network engineer | Enterprise IT | Home user | Admin / Security analyst |
| Anomaly detection | None | SNMP threshold alerts | Basic | Built-in, pattern-based |
| Cost | Free | Expensive licensing | Freemium | Free / open |
| PCAP support | Yes | No | No | Yes |

---
