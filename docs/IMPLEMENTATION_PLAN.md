# Vaneesa - Implementation Plan

This document outlines the phased approach to building Vaneesa from the ground up, moving from the empty repository to a fully functional Wails v3 network monitor.

**Note on Styling:** All UI components will use **Vanilla CSS** for strict control, high performance, and to prevent utility-class clutter, as well as providing premium dark-themed aesthetics.

---

## Phase 1: Project Initialisation & Skeleton
*Goal: Have a running Wails v3 application with a React + TypeScript frontend talking to an empty Go backend.*

**Status: ✅ Complete**

1. **Initialise Wails:** Use `wails3 init` to establish the React + TypeScript template.
2. **Directory Structure:** Organise the `frontend/src` into `components/`, `views/`, `store/`, and `styles/`.
3. **Vanilla CSS Setup:** Establish global CSS variables (`index.css`) defining the dark-first colour palette (backgrounds, primary/secondary text, alert severities, table borders, typefaces).
4. **Service Stubs (Go):** Create the boilerplate structs for `CaptureService`, `FlowService`, `AlertService`, etc., and register them with the Wails application instance.

---

## Phase 2: Core UI Shell & Navigation State
*Goal: The user can navigate between completely empty shell views.*

**Status: 🟡 In Progress (Menus Complete)**

1. **Zustand Store (Navigation):** Setup global state to track the active view.
2. **Main Layout Layout:** Build the overarching flex/grid structure containing:
    - Native OS Titlebar (Vaneesa uses standard native window frames, not frameless)
    - Sidebar / Activity bar (navigation icons)
    - Status/Toolbar (for current capture state, session name)
    - Active Viewport
3. **Empty Views:** Create the empty placeholder React components for Dashboard, Connections, Hosts, Protocols, Alerts, Sessions, and Settings.
4. **Native Menus (Go):** ✅ Define the basic Wails OS Application Menus (File, Edit, View, Help).
    - File: New Session, Open PCAP, Export (CSV/JSON), Settings, Quit
    - Edit: Standard undo/redo/cut/copy/paste (via Wails role)
    - View: Navigate to all views (Ctrl+1-6), Zoom controls, Fullscreen toggle
    - Window: Standard window management (via Wails role)
    - Help: Documentation, Check for Updates, About
    - All menu items emit Wails events for frontend to handle

---

## Phase 3: Simulated Data Environment (Mock Data)
*Goal: Work on the complex UI views without requiring live raw socket capture privileges.*

1. **Zustand Mock Adapters:** Write mock data generators within the frontend that periodically push dummy `TrafficSnapshot` and `Alert` events into the store.
2. **Populate Dashboard:** Implement Recharts based on simulated metrics. Build the real-time bandwidth charts and top talker lists.
3. **Virtualised Connection Table:** Implement the TanStack Virtual scrolling table in the `Connections` view, populated by mock flows.
4. **Context Menus:** Wire Wails native Context Menus to react to right-clicks on the mock table rows.

---

## Phase 4: Backend Database & Configuration Layer
*Goal: Prepare the static, non-capture backend.*

1. **SQLite Database:** Include `modernc.org/sqlite` and define the raw SQL startup migrations.
2. **Data Access Models:** Write Go queries for reading/writing `sessions`, `settings`, `flows`, and `alerts`.
3. **Settings Service:** Connect the Settings UI to actually read/write from the database via the Wails bindings.

---

## Phase 5: The Capture Pipeline Core
*Goal: The most critical phase: reading bytes off the network interface.*

1. **Pcap Integration:** Write the goroutine that uses `gopacket` / `pcap` to open an interface.
2. **Packet Processor:** Build the pool of decoders that extract L3/L4 metadata into `ParsedPacket` structs.
3. **Traffic Aggregator:** Implement the 1000ms ticker that converts `ParsedPacket` streams into a unified `TrafficSnapshot`.
4. **Connect to Frontend:** Disconnect the mock frontend adaptors and bind them directly to the `vaneesa:snapshot` events coming from the real Go backend Emitter.

---

## Phase 6: Anomaly Detection
*Goal: Bring intelligence to the raw traffic data.*

1. **Detector Ticker:** Insert the Detector logic between the Aggregator and the Emitter.
2. **The 4 Rules:** Implement Rate Spikes, Port Scans, SYN Floods, and New Host logic.
3. **Alert Pushing:** Push alerts via DB saves and real-time Wails events.
4. **Alert UI Remediation:** Test the badge counts and notification handling in the frontend.

---

## Phase 7: Polish & PCAP Replay
*Goal: Finalise workflows and add offline session support.*

1. **PCAP Loader:** Implement `gopacket`'s offline PCAP reader stream, feeding into the exact same Capture Pipeline infrastructure.
2. **Export Triggers:** Implement CSV/JSON standard exports from the Session views.
3. **Final UI Review:** Ensure transitions, hover states, selection states, and window native resize behaviours are perfectly smooth.
