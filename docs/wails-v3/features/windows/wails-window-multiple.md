# Multiple Windows

Patterns and best practices for multi-window applications.

Wails v3 provides **native multi-window support** for creating settings windows, document windows, tool palettes, and inspector windows. Track windows, enable communication between them, and manage their lifecycle with simple, consistent APIs.

---

## Quick Start — Main + Settings Window

```go
package main

import "github.com/wailsapp/wails/v3/pkg/application"

type App struct {
    app            *application.Application
    mainWindow     *application.WebviewWindow
    settingsWindow *application.WebviewWindow
}

func main() {
    app := &App{}

    app.app = application.New(application.Options{
        Name: "Multi-Window App",
    })

    app.mainWindow = app.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "main",
        Title:  "Main Application",
        Width:  1200,
        Height: 800,
    })

    // Settings window — hidden initially
    app.settingsWindow = app.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "settings",
        Title:  "Settings",
        Width:  600,
        Height: 400,
        Hidden: true,
    })

    app.app.Run()
}

func (a *App) ShowSettings() {
    if a.settingsWindow != nil {
        a.settingsWindow.Show()
        a.settingsWindow.SetFocus()
    }
}
```

Key points: main window always visible; settings window created but hidden; show on demand; reuse the same window rather than creating new ones.

---

## Window Tracking

### Get All Windows

```go
windows := app.Window.GetAll()
for _, window := range windows {
    fmt.Printf("- %s (ID: %d)\n", window.Name(), window.ID())
}
```

### Find Specific Window

```go
settings := app.GetWindowByName("settings")
if settings != nil {
    settings.Show()
}

window := app.GetWindowByID(123)

current := app.Window.Current()
```

### Window Registry Pattern

```go
type WindowManager struct {
    windows map[string]*application.WebviewWindow
    mu      sync.RWMutex
}

func (wm *WindowManager) Register(name string, window *application.WebviewWindow) {
    wm.mu.Lock()
    defer wm.mu.Unlock()
    wm.windows[name] = window
}

func (wm *WindowManager) Get(name string) *application.WebviewWindow {
    wm.mu.RLock()
    defer wm.mu.RUnlock()
    return wm.windows[name]
}

func (wm *WindowManager) Remove(name string) {
    wm.mu.Lock()
    defer wm.mu.Unlock()
    delete(wm.windows, name)
}
```

---

## Window Communication

### Using Events

```go
// Emit from main window
app.Event.Emit("settings-changed", map[string]interface{}{
    "theme":    "dark",
    "fontSize": 14,
})

// Listen in settings window
app.Event.On("settings-changed", func(event *application.WailsEvent) {
    data := event.Data.(map[string]interface{})
    theme := data["theme"].(string)
    updateSettings(theme)
})
```

### Shared State Pattern

```go
type AppState struct {
    theme string
    mu    sync.RWMutex
}

var state = &AppState{theme: "light"}

func (s *AppState) SetTheme(theme string) {
    s.mu.Lock()
    s.theme = theme
    s.mu.Unlock()

    app.Event.Emit("theme-changed", theme)
}

func (s *AppState) GetTheme() string {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.theme
}
```

### Window-to-Window Messages

```go
targetWindow := app.GetWindowByName("preview")
targetWindow.EmitEvent("update-preview", previewData)
```

---

## Common Patterns

### Pattern 1: Singleton Windows

Ensure only one instance of a window:

```go
var settingsWindow *application.WebviewWindow

func ShowSettings(app *application.Application) {
    if settingsWindow == nil {
        settingsWindow = app.Window.NewWithOptions(application.WebviewWindowOptions{
            Name:   "settings",
            Title:  "Settings",
            Width:  600,
            Height: 400,
        })

        settingsWindow.OnDestroy(func() {
            settingsWindow = nil
        })
    }

    settingsWindow.Show()
    settingsWindow.SetFocus()
}
```

### Pattern 2: Document Windows

Multiple instances of the same window type:

```go
var documents = make(map[string]*DocumentWindow)

func OpenDocument(app *application.Application, filePath string) {
    if doc, exists := documents[filePath]; exists {
        doc.window.Show()
        doc.window.SetFocus()
        return
    }

    window := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:  filepath.Base(filePath),
        Width:  800,
        Height: 600,
    })

    documents[filePath] = &DocumentWindow{window: window, filePath: filePath}

    window.OnDestroy(func() {
        delete(documents, filePath)
    })

    loadDocument(window, filePath)
}
```

### Pattern 3: Tool Palettes

Floating windows that stay on top:

```go
func CreateToolPalette(app *application.Application) *application.WebviewWindow {
    return app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:        "tools",
        Title:       "Tools",
        Width:       200,
        Height:      400,
        AlwaysOnTop: true,
        Resizable:   false,
    })
}
```

### Pattern 4: Modal Dialogs (macOS only)

```go
func ShowModalDialog(parent *application.WebviewWindow, title string) {
    dialog := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:       title,
        Width:       400,
        Height:      200,
        AlwaysOnTop: true,
        Resizable:   false,
    })

    parent.AttachModal(dialog)
}
```

### Pattern 5: Inspector / Preview Windows

Linked windows that update together:

```go
type EditorApp struct {
    editor  *application.WebviewWindow
    preview *application.WebviewWindow
}

func (e *EditorApp) UpdatePreview(content string) {
    if e.preview != nil && e.preview.IsVisible() {
        e.preview.EmitEvent("content-changed", content)
    }
}

func (e *EditorApp) TogglePreview() {
    if e.preview == nil {
        e.preview = app.Window.NewWithOptions(application.WebviewWindowOptions{
            Name:   "preview",
            Title:  "Preview",
            Width:  600,
            Height: 800,
        })

        e.preview.OnDestroy(func() { e.preview = nil })
    }

    if e.preview.IsVisible() {
        e.preview.Hide()
    } else {
        e.preview.Show()
    }
}
```

---

## Parent-Child Relationships

```go
parentWindow.AttachModal(childWindow)
```

Child stays above parent, moves with parent, and blocks interaction to parent.

Platform support: macOS ✅ | Windows ❌ | Linux ❌

---

## Window Lifecycle Management

```go
// Notified when any window is created
app.OnWindowCreation(func(window *application.WebviewWindow) {
    window.SetMinSize(400, 300)
})

// Cleanup on destroy
window.OnDestroy(func() {
    cleanup(window.ID())
    removeFromRegistry(window.Name())
})
```

### Application Quit Behaviour

```go
app := application.New(application.Options{
    Mac: application.MacOptions{
        ApplicationShouldTerminateAfterLastWindowClosed: false,
    },
})
```

Use for system tray applications, background services, or menu bar applications.

---

## Memory Management

Always clean up window references:

```go
var windows = make(map[string]*application.WebviewWindow)

func CreateWindow(name string) {
    window := app.Window.New()
    windows[name] = window

    window.OnDestroy(func() {
        delete(windows, name)
    })
}
```

Use `Close()` for user-initiated closes (triggers `OnClose`, can be cancelled); use `Destroy()` for cleanup (immediate, cannot be cancelled).

---

## Advanced Patterns

### Window Pool

Reuse windows instead of creating new ones:

```go
type WindowPool struct {
    available []*application.WebviewWindow
    inUse     map[uint]*application.WebviewWindow
    mu        sync.Mutex
}

func (wp *WindowPool) Acquire() *application.WebviewWindow {
    wp.mu.Lock()
    defer wp.mu.Unlock()

    if len(wp.available) > 0 {
        window := wp.available[0]
        wp.available = wp.available[1:]
        wp.inUse[window.ID()] = window
        return window
    }

    window := app.Window.New()
    wp.inUse[window.ID()] = window
    return window
}

func (wp *WindowPool) Release(window *application.WebviewWindow) {
    wp.mu.Lock()
    defer wp.mu.Unlock()

    delete(wp.inUse, window.ID())
    window.Hide()
    wp.available = append(wp.available, window)
}
```

### Window Groups

```go
type WindowGroup struct {
    windows []*application.WebviewWindow
}

func (wg *WindowGroup) ShowAll() {
    for _, w := range wg.windows { w.Show() }
}

func (wg *WindowGroup) HideAll() {
    for _, w := range wg.windows { w.Hide() }
}

func (wg *WindowGroup) CloseAll() {
    for _, w := range wg.windows { w.Close() }
}
```

### Workspace Management

Save and restore window layouts:

```go
type WindowLayout struct {
    Windows []WindowState `json:"windows"`
}

type WindowState struct {
    Name   string `json:"name"`
    X      int    `json:"x"`
    Y      int    `json:"y"`
    Width  int    `json:"width"`
    Height int    `json:"height"`
}

func SaveLayout() *WindowLayout {
    layout := &WindowLayout{}

    for _, window := range app.Window.GetAll() {
        x, y := window.Position()
        width, height := window.Size()

        layout.Windows = append(layout.Windows, WindowState{
            Name: window.Name(), X: x, Y: y, Width: width, Height: height,
        })
    }

    return layout
}

func RestoreLayout(layout *WindowLayout) {
    for _, state := range layout.Windows {
        if window := app.GetWindowByName(state.Name); window != nil {
            window.SetPosition(state.X, state.Y)
            window.SetSize(state.Width, state.Height)
        }
    }
}
```

---

## Complete Example

```go
package main

import (
    "encoding/json"
    "os"
    "sync"
    "github.com/wailsapp/wails/v3/pkg/application"
)

type MultiWindowApp struct {
    app     *application.Application
    windows map[string]*application.WebviewWindow
    mu      sync.RWMutex
}

func main() {
    mwa := &MultiWindowApp{
        windows: make(map[string]*application.WebviewWindow),
    }

    mwa.app = application.New(application.Options{
        Name: "Multi-Window Application",
        Mac: application.MacOptions{
            ApplicationShouldTerminateAfterLastWindowClosed: false,
        },
    })

    mwa.CreateMainWindow()
    mwa.LoadLayout()
    mwa.app.Run()
}

func (mwa *MultiWindowApp) CreateMainWindow() {
    window := mwa.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "main",
        Title:  "Main Application",
        Width:  1200,
        Height: 800,
    })
    mwa.RegisterWindow("main", window)
}

func (mwa *MultiWindowApp) ShowSettings() {
    if window := mwa.GetWindow("settings"); window != nil {
        window.Show()
        window.SetFocus()
        return
    }

    window := mwa.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "settings",
        Title:  "Settings",
        Width:  600,
        Height: 400,
    })
    mwa.RegisterWindow("settings", window)
}

func (mwa *MultiWindowApp) RegisterWindow(name string, window *application.WebviewWindow) {
    mwa.mu.Lock()
    mwa.windows[name] = window
    mwa.mu.Unlock()

    window.OnDestroy(func() { mwa.UnregisterWindow(name) })
}

func (mwa *MultiWindowApp) UnregisterWindow(name string) {
    mwa.mu.Lock()
    delete(mwa.windows, name)
    mwa.mu.Unlock()
}

func (mwa *MultiWindowApp) GetWindow(name string) *application.WebviewWindow {
    mwa.mu.RLock()
    defer mwa.mu.RUnlock()
    return mwa.windows[name]
}

func (mwa *MultiWindowApp) SaveLayout() {
    layout := make(map[string]WindowState)

    mwa.mu.RLock()
    for name, window := range mwa.windows {
        x, y := window.Position()
        width, height := window.Size()
        layout[name] = WindowState{X: x, Y: y, Width: width, Height: height}
    }
    mwa.mu.RUnlock()

    data, _ := json.Marshal(layout)
    os.WriteFile("layout.json", data, 0644)
}

func (mwa *MultiWindowApp) LoadLayout() {
    data, err := os.ReadFile("layout.json")
    if err != nil {
        return
    }

    var layout map[string]WindowState
    if err := json.Unmarshal(data, &layout); err != nil {
        return
    }

    for name, state := range layout {
        if window := mwa.GetWindow(name); window != nil {
            window.SetPosition(state.X, state.Y)
            window.SetSize(state.Width, state.Height)
        }
    }
}

type WindowState struct {
    X      int `json:"x"`
    Y      int `json:"y"`
    Width  int `json:"width"`
    Height int `json:"height"`
}
```

---

## Best Practices

### Do

- Track windows — keep references for easy access
- Clean up on destroy — prevent memory leaks
- Use events for communication — decoupled architecture
- Reuse windows — don't create duplicates
- Save/restore layouts — better UX
- Handle window close — confirm before closing with unsaved data

### Don't

- Don't create unlimited windows — memory and performance issues
- Don't forget to clean up — memory leaks
- Don't use global variables carelessly — thread-safety issues
- Don't block window creation — create asynchronously if needed
- Don't ignore platform differences

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Multi-window example](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/multi-window)
