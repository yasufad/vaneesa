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

**Status: ✅ Complete**

1. **Pcap Integration:** ✅ Implemented `internal/capture` package with `gopacket`/`pcap` for live interface capture with BPF filtering and promiscuous mode support.
2. **Packet Processor:** ✅ Built worker pool in `internal/processor` that decodes packets into `ParsedPacket` structs with L3/L4 metadata extraction.
3. **Traffic Aggregator:** ✅ Implemented `internal/aggregator` with 1-second ticker that produces `TrafficSnapshot` with flow tracking, protocol stats, and application-layer event extraction.
4. **Anomaly Detector:** ✅ Implemented `internal/detector` with four detection rules (Rate Spikes, Port Scans, SYN Floods, New Hosts) that analyse snapshots and emit alerts.
5. **CaptureService:** ✅ Orchestrates the four-stage pipeline (Capture → Processor → Aggregator → Detector) with lifecycle management and Wails event emission.
6. **Frontend Stores:** ✅ Created Zustand stores for capture state, traffic snapshots, and settings with proper Wails bindings integration.
7. **Event System:** ✅ Wired Wails events (`vaneesa:status`, `vaneesa:snapshot`, `vaneesa:alert`) to frontend stores for real-time updates.

---

## Phase 5: Frontend UI Implementation
*Goal: Build the actual UI components for capture control and data visualisation.*

1. **Capture Control UI:** Implement start/stop capture controls with interface selection and filter configuration.
2. **Dashboard View:** Build real-time traffic visualisation with charts and metrics.
3. **Connections View:** Implement flow table with sorting, filtering, and pagination.
4. **Hosts View:** Build host discovery table with traffic statistics.
5. **Protocols View:** Implement protocol breakdown visualisation.
6. **Alerts View:** Build alert list with severity filtering and acknowledgement.
7. **Sessions View:** Implement session history with replay capability.

---

## Phase 6: Polish & PCAP Replay
*Goal: Finalise workflows and add offline session support.*

1. **PCAP Loader:** Implement `gopacket`'s offline PCAP reader stream, feeding into the exact same Capture Pipeline infrastructure.
2. **Export Triggers:** Implement CSV/JSON standard exports from the Session views.
3. **Final UI Review:** Ensure transitions, hover states, selection states, and window native resize behaviours are perfectly smooth.
