# Vaneesa - Implementation Plan

This document outlines the phased approach to building Vaneesa from the ground up, moving from the empty repository to a fully functional Wails v3 network monitor.

**Note on Styling:** All UI components will use **Fluent UI v9 React** to ensure a high-quality, highly accessible, and native-feeling desktop experience with premium dark-themed aesthetics.

---

## Phase 1: Project Initialisation & Skeleton
*Goal: Have a running Wails v3 application with a React + TypeScript frontend talking to an empty Go backend.*

**Status: ✅ Complete**

1. **Initialise Wails:** Use `wails3 init` to establish the React + TypeScript template.
2. **Directory Structure:** Organise the `frontend/src` into `components/`, `views/`, `store/`, and `styles/`.
3. **Fluent UI Setup:** Configure the `FluentProvider` with dark/light theme support and establish global design tokens for the application.
4. **Theme Service (Go):** ✅ Implement system theme change detection using Wails v3's `Env.IsDarkMode()` and `ThemeChanged` events. Frontend automatically adapts between light and dark themes.
5. **Service Stubs (Go):** Create the boilerplate structs for `CaptureService`, `FlowService`, `AlertService`, etc., and register them with the Wails application instance.

---

## Phase 2: Core UI Shell & Navigation State
*Goal: The user can navigate between completely empty shell views.*

**Status: ✅ Complete**

1. **Zustand Store (Navigation):** ✅ Setup global state to track the active view.
2. **Main Layout Layout:** ✅ Build the overarching flex/grid structure containing:
    - Native OS Titlebar (Vaneesa uses standard native window frames, not frameless)
    - Resizable Left Panel (sidebar with vertical tabs) - **240px default, resizable 50-400px**
    - Status/Toolbar (for current capture state, session name) - **Bottom status bar implemented**
    - Active Viewport - **Renders current view with Fluent UI**
3. **Empty Views:** ✅ Create the empty placeholder React components for Dashboard, Connections, Hosts, Protocols, Alerts, Sessions, and Settings.
    - All 7 views implemented as placeholder components
    - SettingsView includes capture settings and detector threshold UI (sliders, dropdowns, switches)
4. **Native Menus (Go):** ✅ Complete. All menus implemented with Wails v3 native APIs:
    - **File:** New Session (Ctrl+N), Open PCAP (Ctrl+O), Export CSV/JSON, Settings (Ctrl+,), Quit (Ctrl+Q)
    - **Edit:** Standard undo/redo/cut/copy/paste (via Wails role)
    - **View:** Navigate to views (Ctrl+1-6), Zoom In/Out/Reset (Ctrl++/Ctrl+-/Ctrl+0), Fullscreen (F11/Cmd+F)
    - **Window:** Standard window management (via Wails role)
    - **Help:** Documentation/GitHub, Check for Updates, About Vaneesa (native dialog with app icon)
    - All menu items emit Wails events for frontend to handle; About uses native Dialog.Info() API
5. **Viewport CSS:** ✅ HTML/CSS reset applied to prevent scrollbars and ensure full viewport coverage without margins.
6. **Theme System:** ✅ Frontend listens to `theme:changed` events and switches Fluent UI theme automatically.

---

## Phase 3: Backend Database & Configuration Layer
*Goal: Prepare the static, non-capture backend.*

**Status: ✅ Complete**

1. **SQLite Database:** ✅ Implemented with `modernc.org/sqlite` and sequential migration system with 8 migrations covering all tables.
2. **Data Access Models:** ✅ Complete query methods for sessions, flows, hosts, DNS queries, alerts, snapshots, and settings with pagination and export support.
3. **Settings Service:** ✅ Connected Settings UI to database via Wails bindings with JSON-based settings storage.

---

## Phase 4: The Capture Pipeline Core
*Goal: The most critical phase: reading bytes off the network interface.*

1. **Pcap Integration:** Write the goroutine that uses `gopacket` / `pcap` to open an interface.
2. **Packet Processor:** Build the pool of decoders that extract L3/L4 metadata into `ParsedPacket` structs.
3. **Traffic Aggregator:** Implement the 1000ms ticker that converts `ParsedPacket` streams into a unified `TrafficSnapshot`.
4. **Connect to Frontend:** Bind the frontend store directly to the `vaneesa:snapshot` events coming from the Go backend Emitter.

---

## Phase 5: Anomaly Detection
*Goal: Bring intelligence to the raw traffic data.*

1. **Detector Ticker:** Insert the Detector logic between the Aggregator and the Emitter.
2. **The 4 Rules:** Implement Rate Spikes, Port Scans, SYN Floods, and New Host logic.
3. **Alert Pushing:** Push alerts via DB saves and real-time Wails events.
4. **Alert UI Remediation:** Test the badge counts and notification handling in the frontend.

---

## Phase 6: Polish & PCAP Replay
*Goal: Finalise workflows and add offline session support.*

1. **PCAP Loader:** Implement `gopacket`'s offline PCAP reader stream, feeding into the exact same Capture Pipeline infrastructure.
2. **Export Triggers:** Implement CSV/JSON standard exports from the Session views.
3. **Final UI Review:** Ensure transitions, hover states, selection states, and window native resize behaviours are perfectly smooth.
