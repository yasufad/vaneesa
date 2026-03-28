# Vaneesa - User Flow and UI/UX Plan

This document maps out the specific user flows, window structures, menus, and context menus for Vaneesa, taking advantage of Wails v3 native capabilities.

---

## 1. Application Structure and Window

Vaneesa runs as a single-window desktop application. The window will be heavily driven by the Wails v3 dark-first interface, using CSS/React for most visual elements, whilst delegating system-level menus to native Wails v3 implementations.

**Primary Layout (React/Zustand):**
- **Sidebar / Activity Bar:** For navigating between major views (Dashboard, Connections, Hosts, Protocols, Alerts, Sessions, Settings).
- **Status/Title Bar:** Indicates current capture state (Live, PCAP Replay, Offline), current session name, and active interface.
- **Main Viewport:** Renders the currently selected view.

---

## 2. Application Menus (Native Wails v3)

Instead of building custom HTML menus, Vaneesa will tie into the OS-native application menu provided by Wails v3.

### **File**
- **New Live Session...** (Ctrl/Cmd+N) - Prompts for session name and interface.
- **Open PCAP File...** (Ctrl/Cmd+O) - Switches from live capture to replay mode.
- **Export Current Session**
    - Export Connections as CSV
    - Export Connections as JSON
    - Export PCAP (Planned)
- **Settings** (Ctrl/Cmd+,) - Opens the `Settings.tsx` view.
- **Quit** (Ctrl/Cmd+Q)

### **Edit**
- **Copy** (Ctrl/Cmd+C)
- **Select All** (Ctrl/Cmd+A)
*(Required for native text selection inside tables and inputs)*

### **View**
- **Dashboard** (Ctrl/Cmd+1)
- **Connections** (Ctrl/Cmd+2)
- **Hosts** (Ctrl/Cmd+3)
- **Protocols** (Ctrl/Cmd+4)
- **Alerts** (Ctrl/Cmd+5)
- **Sessions** (Ctrl/Cmd+6)
- **Separator**
- **Zoom In** (Ctrl/Cmd++)
- **Zoom Out** (Ctrl/Cmd+-)
- **Toggle Fullscreen** (F11 / Ctrl+Cmd+F)

### **Help**
- **Documentation / GitHub**
- **Check for Updates**
- **About Vaneesa**

---

## 3. Context Menus (Wails v3 Context Menus)

Context menus will be built using Wails v3 Native Context Menus, triggered via a right-click on specific UI elements (such as rows in TanStack Virtual tables).

### **Connections View (Right-click a Flow row)**
- **Copy Source IP**
- **Copy Destination IP**
- **Filter by Source IP** (Applies a quick filter to the view)
- **Filter by Destination IP**
- **View Source Host Detail** (Navigates to `Hosts.tsx` focused on this IP)
- **View Destination Host Detail**

### **Hosts View (Right-click a Host row)**
- **Copy IP Address**
- **Copy MAC Address**
- **View Host Connections** (Navigates to `Connections.tsx` filtered by this host)

### **Alerts View (Right-click an Alert row)**
- **Acknowledge Alert** (Marks as read, reduces badge count)
- **Filter by Alert IP**
- **Copy Alert Details**

---

## 4. Key User Journeys

### **Flow A: The "Cold Start" Journey**
1. User launches Vaneesa.
2. The Wails `ServiceStartup` verifies capture privileges (npcap/libpcap). 
    - *If missing:* A dark, clean "Dependencies Needed" screen explains how to run as administrator or install `npcap`.
3. If privileges exist, Vaneesa opens the **Sessions** view (or a "Start Capture" modal).
4. User selects an interface from a dropdown, names the session (e.g., "Office Network Debug"), and hits **Start**.
5. Vaneesa routes immediately to the **Dashboard** view. Real-time graphs (bandwidth per second, protocol pie chart) start populating immediately. 

### **Flow B: The "What's Using Bandwidth?" Journey**
1. User looks at the **Dashboard** and notices a massive spike in outbound traffic.
2. They click the `Connections` tab (or hit Ctrl+2).
3. They sort the virtual table by "Bytes Out" (descending).
4. They identify a specific internal IP talking to an external IP.
5. They right-click the row -> **View Source Host Detail**.
6. The app pivots to the **Hosts** view, laying out all connections and alerting history for that specific machine, making it easy to see if this is isolated behaviour or part of a wider port scan/data exfiltration.

### **Flow C: Interpreting an Alert**
1. A rate-spike occurs. The Go Detector emits an alert.
2. The UI pushes a discreet toast notification, and the **Alerts** sidebar icon shows a red badge (e.g., `1`).
3. User clicks **Alerts** to view the timeline.
4. They read the description: *"Rate over 60s average (Source IP 10.0.0.45)"*.
5. They right-click the alert -> **Acknowledge**, making it gray out and dropping the badge count.
6. They seamlessly jump to **Connections** filtered by `10.0.0.45` to monitor the traffic causing the alert.

### **Flow D: Retroactive Analysis (PCAP Replay)**
1. User goes to **File -> Open PCAP File...**
2. Vaneesa's UI changes its status indicator from `🟢 LIVE: en0` to `🔵 REPLAY: capture_2026.pcap`.
3. The Dashboard immediately populates with the data *as if* the session was happening.
4. The user has access to all the same sorting, filtering, and Context Menu abilities as they would in real-time.

---

## 5. Next Steps for Implementation
1. **Initialise standard Wails v3 frontend boilerplate** (React + TypeScript + Vite + Tailwind/Zustand if preferred).
2. **Setup the pure UI shell**: Activity Bar, Title Bar layout without actual data.
3. **Register native Wails Application Menus** within `main.go`.
4. **Implement Zustand Mock Stores** so the frontend can be developed without a live packet capture dependency.
