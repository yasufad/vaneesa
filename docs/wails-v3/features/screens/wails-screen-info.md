# Screen Information

Get information about displays and monitors.

Wails provides a **unified screen API** that works across all platforms. Get screen information, detect multiple monitors, query screen properties (size, position, DPI), identify the primary display, and handle DPI scaling with consistent code.

---

## Quick Start

```go
// Get all screens
screens := app.Screen.GetAll()

for _, screen := range screens {
    fmt.Printf("Screen: %s (%dx%d)\n", screen.Name, screen.Width, screen.Height)
}

// Get primary screen
primary := app.Screens.GetPrimary()
fmt.Printf("Primary: %s\n", primary.Name)
```

---

## Getting Screen Information

### All Screens

```go
screens := app.Screen.GetAll()

for _, screen := range screens {
    fmt.Printf("ID: %s\n", screen.ID)
    fmt.Printf("Name: %s\n", screen.Name)
    fmt.Printf("Size: %dx%d\n", screen.Width, screen.Height)
    fmt.Printf("Position: %d,%d\n", screen.X, screen.Y)
    fmt.Printf("Scale: %.2f\n", screen.ScaleFactor)
    fmt.Printf("Primary: %v\n", screen.IsPrimary)
    fmt.Println("---")
}
```

### Primary Screen

```go
primary := app.Screens.GetPrimary()

fmt.Printf("Primary screen: %s\n", primary.Name)
fmt.Printf("Resolution: %dx%d\n", primary.Width, primary.Height)
fmt.Printf("Scale factor: %.2f\n", primary.ScaleFactor)
```

### Current Screen

Get the screen containing a specific window:

```go
screen := app.Screens.GetCurrent(window)

fmt.Printf("Window is on: %s\n", screen.Name)
```

### Screen by ID

```go
screen := app.Screens.GetByID("screen-id")
if screen != nil {
    fmt.Printf("Found screen: %s\n", screen.Name)
}
```

---

## Screen Properties

### Screen Structure

```go
type Screen struct {
    ID          string  // Unique identifier
    Name        string  // Display name
    X           int     // X position
    Y           int     // Y position
    Width       int     // Width in pixels
    Height      int     // Height in pixels
    ScaleFactor float32 // DPI scale (1.0, 1.5, 2.0, etc.)
    IsPrimary   bool    // Is this the primary screen?
}
```

### Physical vs Logical Pixels

```go
screen := app.Screens.GetPrimary()

// Logical pixels (what you use in Wails)
logicalWidth  := screen.Width
logicalHeight := screen.Height

// Physical pixels (actual display resolution)
physicalWidth  := int(float32(screen.Width)  * screen.ScaleFactor)
physicalHeight := int(float32(screen.Height) * screen.ScaleFactor)

fmt.Printf("Logical:  %dx%d\n", logicalWidth, logicalHeight)
fmt.Printf("Physical: %dx%d\n", physicalWidth, physicalHeight)
fmt.Printf("Scale:    %.2f\n", screen.ScaleFactor)
```

Common scale factors: `1.0` (96 DPI standard), `1.25` (120 DPI), `1.5` (144 DPI), `2.0` (192 DPI / Retina), `3.0` (288 DPI / 4K–5K).

---

## Window Positioning

### Centre on Screen

```go
func centreOnScreen(window *application.WebviewWindow, screen *Screen) {
    windowWidth, windowHeight := window.Size()

    x := screen.X + (screen.Width-windowWidth)/2
    y := screen.Y + (screen.Height-windowHeight)/2

    window.SetPosition(x, y)
}
```

### Position on Specific Screen

```go
func moveToScreen(window *application.WebviewWindow, screenIndex int) {
    screens := app.Screen.GetAll()

    if screenIndex < 0 || screenIndex >= len(screens) {
        return
    }

    centreOnScreen(window, screens[screenIndex])
}
```

### Position Relative to Screen Corners

```go
// Top-left
func positionTopLeft(window *application.WebviewWindow, screen *Screen) {
    window.SetPosition(screen.X+10, screen.Y+10)
}

// Top-right
func positionTopRight(window *application.WebviewWindow, screen *Screen) {
    windowWidth, _ := window.Size()
    window.SetPosition(screen.X+screen.Width-windowWidth-10, screen.Y+10)
}

// Bottom-right
func positionBottomRight(window *application.WebviewWindow, screen *Screen) {
    windowWidth, windowHeight := window.Size()
    window.SetPosition(
        screen.X+screen.Width-windowWidth-10,
        screen.Y+screen.Height-windowHeight-10,
    )
}
```

---

## Multi-Monitor Support

### Detect Multiple Monitors

```go
func hasMultipleMonitors() bool {
    return len(app.Screen.GetAll()) > 1
}

func getMonitorCount() int {
    return len(app.Screen.GetAll())
}
```

### List All Monitors

```go
func listMonitors() {
    screens := app.Screen.GetAll()

    fmt.Printf("Found %d monitor(s):\n", len(screens))

    for i, screen := range screens {
        primary := ""
        if screen.IsPrimary {
            primary = " (Primary)"
        }

        fmt.Printf("%d. %s%s\n", i+1, screen.Name, primary)
        fmt.Printf("   Resolution: %dx%d\n", screen.Width, screen.Height)
        fmt.Printf("   Position: %d,%d\n", screen.X, screen.Y)
        fmt.Printf("   Scale: %.2fx\n", screen.ScaleFactor)
    }
}
```

---

## Complete Examples

### Multi-Monitor Window Manager

```go
type MultiMonitorManager struct {
    app     *application.Application
    windows map[int]*application.WebviewWindow
}

func NewMultiMonitorManager(app *application.Application) *MultiMonitorManager {
    return &MultiMonitorManager{
        app:     app,
        windows: make(map[int]*application.WebviewWindow),
    }
}

func (m *MultiMonitorManager) CreateWindowOnScreen(screenIndex int) error {
    screens := m.app.Screen.GetAll()

    if screenIndex < 0 || screenIndex >= len(screens) {
        return errors.New("invalid screen index")
    }

    screen := screens[screenIndex]

    window := m.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:  fmt.Sprintf("Window on %s", screen.Name),
        Width:  800,
        Height: 600,
    })

    x := screen.X + (screen.Width-800)/2
    y := screen.Y + (screen.Height-600)/2
    window.SetPosition(x, y)
    window.Show()

    m.windows[screenIndex] = window
    return nil
}

func (m *MultiMonitorManager) CreateWindowOnEachScreen() {
    screens := m.app.Screen.GetAll()
    for i := range screens {
        m.CreateWindowOnScreen(i)
    }
}
```

### Screen Change Detection

```go
type ScreenMonitor struct {
    app           *application.Application
    lastScreens   []*Screen
    changeHandler func([]*Screen)
}

func NewScreenMonitor(app *application.Application) *ScreenMonitor {
    return &ScreenMonitor{
        app:         app,
        lastScreens: app.Screen.GetAll(),
    }
}

func (sm *ScreenMonitor) OnScreenChange(handler func([]*Screen)) {
    sm.changeHandler = handler
}

func (sm *ScreenMonitor) Start() {
    ticker := time.NewTicker(2 * time.Second)

    go func() {
        for range ticker.C {
            sm.checkScreens()
        }
    }()
}

func (sm *ScreenMonitor) checkScreens() {
    current := sm.app.Screen.GetAll()

    if len(current) != len(sm.lastScreens) {
        sm.lastScreens = current
        if sm.changeHandler != nil {
            sm.changeHandler(current)
        }
    }
}
```

### DPI-Aware Window Sizing

```go
func createDPIAwareWindow(screen *Screen) *application.WebviewWindow {
    baseWidth  := 800
    baseHeight := 600

    width  := int(float32(baseWidth)  * screen.ScaleFactor)
    height := int(float32(baseHeight) * screen.ScaleFactor)

    window := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:  "DPI-Aware Window",
        Width:  width,
        Height: height,
    })

    x := screen.X + (screen.Width-width)/2
    y := screen.Y + (screen.Height-height)/2
    window.SetPosition(x, y)

    return window
}
```

### Screen Layout Visualiser

```go
func visualiseScreenLayout() string {
    screens := app.Screen.GetAll()

    var layout strings.Builder
    layout.WriteString("Screen Layout:\n\n")

    for i, screen := range screens {
        primary := ""
        if screen.IsPrimary {
            primary = " [PRIMARY]"
        }

        layout.WriteString(fmt.Sprintf("Screen %d: %s%s\n", i+1, screen.Name, primary))
        layout.WriteString(fmt.Sprintf("  Position: (%d, %d)\n", screen.X, screen.Y))
        layout.WriteString(fmt.Sprintf("  Size: %dx%d\n", screen.Width, screen.Height))
        layout.WriteString(fmt.Sprintf("  Scale: %.2fx\n", screen.ScaleFactor))
        layout.WriteString(fmt.Sprintf("  Physical: %dx%d\n",
            int(float32(screen.Width)*screen.ScaleFactor),
            int(float32(screen.Height)*screen.ScaleFactor)))
        layout.WriteString("\n")
    }

    return layout.String()
}
```

---

## Best Practices

### Do

- Check screen count — handle both single and multiple monitor setups
- Use logical pixels — Wails handles DPI automatically
- Centre windows — better UX than fixed positions
- Validate positions — ensure windows are on-screen
- Handle screen changes — monitors can be added or removed (e.g. laptop docking)
- Test on different DPI settings — 100%, 125%, 150%, 200%

### Don't

- Don't hardcode positions — use screen dimensions
- Don't assume the primary screen — the user may have multiple monitors
- Don't ignore scale factor — important for DPI-aware sizing
- Don't position windows off-screen — validate coordinates
- Don't use physical pixels — use logical pixels

---

## Platform Differences

### macOS

- Retina displays use a 2x scale factor
- Multiple displays are common
- Coordinate system: (0, 0) at bottom-left
- Spaces (virtual desktops) can affect positioning

### Windows

- Various DPI scaling levels: 100%, 125%, 150%, 200%
- Multiple displays are common
- Coordinate system: (0, 0) at top-left
- Per-monitor DPI awareness supported

### Linux

- Behaviour varies by desktop environment
- X11 vs Wayland differences apply
- DPI scaling support varies
- Multiple displays supported

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Screen examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples)
