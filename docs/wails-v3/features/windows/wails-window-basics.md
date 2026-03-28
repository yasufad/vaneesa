# Window Basics

Creating and managing application windows in Wails.

Wails provides a **unified window management API** that works across all platforms. Create windows, control their behaviour, and manage multiple windows with full control over creation, appearance, behaviour, and lifecycle.

---

## Quick Start

```go
package main

import "github.com/wailsapp/wails/v3/pkg/application"

func main() {
    app := application.New(application.Options{
        Name: "My App",
    })

    window := app.Window.New()
    window.SetTitle("Hello Wails")
    window.SetSize(800, 600)
    window.Center()
    window.Show()

    app.Run()
}
```

---

## Creating Windows

### Basic Window

```go
window := app.Window.New()
```

What you get: default size (800x600), default title (application name), WebView ready for your frontend, platform-native appearance.

### Window with Options

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:       "My Application",
    Width:       1200,
    Height:      800,
    X:           100,
    Y:           100,
    AlwaysOnTop: false,
    Frameless:   false,
    Hidden:      false,
    MinWidth:    400,
    MinHeight:   300,
    MaxWidth:    1920,
    MaxHeight:   1080,
})
```

| Option | Type | Description |
|---|---|---|
| `Title` | `string` | Window title |
| `Width` | `int` | Window width in pixels |
| `Height` | `int` | Window height in pixels |
| `X` | `int` | X position (from left) |
| `Y` | `int` | Y position (from top) |
| `AlwaysOnTop` | `bool` | Keep window above others |
| `Frameless` | `bool` | Remove title bar and borders |
| `Hidden` | `bool` | Start hidden |
| `MinWidth` | `int` | Minimum width |
| `MinHeight` | `int` | Minimum height |
| `MaxWidth` | `int` | Maximum width |
| `MaxHeight` | `int` | Maximum height |

### Named Windows

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Name:  "main-window",
    Title: "Main Application",
})

// Later, find it by name
mainWindow := app.GetWindowByName("main-window")
if mainWindow != nil {
    mainWindow.Show()
}
```

---

## Controlling Windows

### Show and Hide

```go
window.Show()
window.Hide()

if window.IsVisible() {
    fmt.Println("Window is visible")
}
```

### Position and Size

```go
window.SetSize(1024, 768)
window.SetPosition(100, 100)
window.Center()

width, height := window.Size()
x, y := window.Position()
```

Coordinate system: (0, 0) is top-left of primary screen; positive X goes right, positive Y goes down.

### Window State

```go
window.Minimise()
window.Maximise()
window.Fullscreen()
window.Restore()

if window.IsMinimised()  { fmt.Println("Minimised") }
if window.IsMaximised()  { fmt.Println("Maximised") }
if window.IsFullscreen() { fmt.Println("Fullscreen") }
```

State transitions: `Normal ↔ Minimised`, `Normal ↔ Maximised`, `Normal ↔ Fullscreen`.

### Title and Appearance

```go
window.SetTitle("My Application - Document.txt")
window.SetBackgroundColour(0, 0, 0, 255) // RGBA
window.SetAlwaysOnTop(true)
window.SetResizable(false)
```

### Closing Windows

```go
window.Close()    // Triggers close event, can be cancelled
window.Destroy()  // Immediate destruction, cannot be cancelled
```

---

## Finding Windows

### By Name

```go
window := app.GetWindowByName("settings")
if window != nil {
    window.Show()
}
```

### By ID

```go
id := window.ID()

foundWindow := app.GetWindowByID(id)
```

### Current Window

```go
current := app.Window.Current()
if current != nil {
    current.SetTitle("Active Window")
}
```

### All Windows

```go
windows := app.Window.GetAll()
fmt.Printf("Total windows: %d\n", len(windows))

for _, w := range windows {
    fmt.Printf("Window: %s (ID: %d)\n", w.Name(), w.ID())
}
```

---

## Window Lifecycle

### Creation

```go
app.OnWindowCreation(func(window *application.WebviewWindow) {
    fmt.Printf("Window created: %s\n", window.Name())
    window.SetMinSize(400, 300)
})
```

### Closing

```go
window.OnClose(func() bool {
    if hasUnsavedChanges() {
        result := showConfirmDialog("Unsaved changes. Close anyway?")
        return result == "yes"
    }
    return true
})
```

> `OnClose` only works for user-initiated closes (clicking X button). It does not prevent `window.Destroy()`.

### Destruction

```go
window.OnDestroy(func() {
    fmt.Println("Window destroyed")
    // Cleanup resources
})
```

---

## Multiple Windows

### Creating Multiple Windows

```go
mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Name:   "main",
    Title:  "Main Application",
    Width:  1200,
    Height: 800,
})

settingsWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Name:   "settings",
    Title:  "Settings",
    Width:  600,
    Height: 400,
    Hidden: true,
})

settingsWindow.Show()
```

### Window Communication

```go
// Emit from anywhere
app.Event.Emit("data-updated", map[string]interface{}{"value": 42})

// Listen from anywhere
app.Event.On("data-updated", func(event *application.WailsEvent) {
    data := event.Data.(map[string]interface{})
    value := data["value"].(int)
    fmt.Printf("Received: %d\n", value)
})
```

### Parent-Child Windows

```go
childWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:  "Child Window",
    Parent: mainWindow,
})
```

Behaviour varies by platform: full support on macOS, partial on Windows, varies on Linux.

---

## Platform-Specific Features

### Windows

```go
// Flash taskbar button
window.Flash(true)   // Start flashing
window.Flash(false)  // Stop flashing

// Trigger Windows 11 Snap Assist
window.SnapAssist()

// Set window icon
window.SetIcon(iconBytes)
```

### macOS

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Mac: application.MacWindow{
        TitleBar: application.MacTitleBar{
            AppearsTransparent: true,
        },
        Backdrop: application.MacBackdropTranslucent,
    },
})
```

Backdrop types: `MacBackdropNormal`, `MacBackdropTranslucent`, `MacBackdropTransparent`. macOS fullscreen creates a new Space (virtual desktop).

### Linux

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Linux: application.LinuxOptions{
        Icon: iconBytes,
    },
})
```

Note: On tiling window managers (Hyprland, Sway, i3, etc.), `Minimise()`, `Maximise()`, `SetSize()`, and `SetPosition()` may be ignored or behave differently — the WM controls window geometry.

---

## Common Patterns

### Splash Screen

```go
splash := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:       "Loading...",
    Width:       400,
    Height:      300,
    Frameless:   true,
    AlwaysOnTop: true,
})

splash.Show()

time.Sleep(2 * time.Second)

splash.Close()
mainWindow.Show()
```

### Settings Window

```go
var settingsWindow *application.WebviewWindow

func showSettings() {
    if settingsWindow == nil {
        settingsWindow = app.Window.NewWithOptions(application.WebviewWindowOptions{
            Name:   "settings",
            Title:  "Settings",
            Width:  600,
            Height: 400,
        })
    }

    settingsWindow.Show()
    settingsWindow.SetFocus()
}
```

### Confirm Before Close

```go
window.OnClose(func() bool {
    if hasUnsavedChanges() {
        result := showConfirmDialog("Unsaved changes. Close anyway?")
        return result == "yes"
    }
    return true
})
```

---

## Best Practices

### Do

- Name important windows — easier to find later
- Set minimum size to prevent unusable layouts
- Centre windows for better UX than random position
- Handle close events to prevent data loss
- Test on all platforms — behaviour varies
- Use appropriate sizes for different screen sizes

### Don't

- Don't create too many windows — confusing for users
- Don't forget to close windows — memory leaks
- Don't hardcode positions — different screen sizes
- Don't ignore platform differences
- Don't block the UI thread — use goroutines for long operations

---

## Troubleshooting

**Window not showing:** call `window.Show()`, `window.Center()`, `window.SetFocus()`.

**Window wrong size:** Wails handles DPI scaling automatically — just use logical pixels.

**Window closes immediately:** the application exits when the last window closes. To prevent this on macOS:

```go
app := application.New(application.Options{
    Mac: application.MacOptions{
        ApplicationShouldTerminateAfterLastWindowClosed: false,
    },
})
```

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Window examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples)
