# Window Events

Handle window lifecycle and state change events.

Wails provides **comprehensive event hooks** for window lifecycle and state changes: creation, focus/blur, resize/move, minimise/maximise, and close events. Register callbacks, handle events, and coordinate between windows with simple, consistent APIs.

---

## Lifecycle Events

### OnCreate

Called when a window is created:

```go
app.OnWindowCreation(func(window *application.WebviewWindow) {
    fmt.Printf("Window created: %s (ID: %d)\n", window.Name(), window.ID())

    window.SetMinSize(400, 300)

    window.OnClose(func() bool {
        return confirmClose()
    })
})
```

Use cases: configure all windows consistently, register event handlers, track window creation, initialise window-specific resources.

### OnClose

Called when the user attempts to close the window:

```go
window.OnClose(func() bool {
    if hasUnsavedChanges() {
        result := showConfirmDialog("Unsaved changes. Close anyway?")
        return result == "yes"
    }
    return true
})
```

Return `false` to cancel the close, `true` to allow it.

> Only triggered by user actions (clicking X button). NOT triggered by `window.Destroy()`. Cancelling close does not prevent `Destroy()`.

Use cases: confirm before closing, save state, prevent accidental closure, cleanup before close.

### OnDestroy

Called when the window is destroyed:

```go
window.OnDestroy(func() {
    fmt.Printf("Window destroyed: %s\n", window.Name())

    closeDatabase()
    removeWindowFromRegistry(window.ID())
    updateWindowCount()
})
```

Always called when the window is destroyed, cannot be cancelled. This is the last chance to clean up.

Use cases: release resources, close connections, update application state, remove from tracking.

Example with resource cleanup:

```go
type ManagedWindow struct {
    window    *application.WebviewWindow
    db        *sql.DB
    listeners []func()
}

func (mw *ManagedWindow) Setup() {
    mw.window.OnDestroy(func() {
        if mw.db != nil {
            mw.db.Close()
        }

        for _, listener := range mw.listeners {
            listener()
        }

        mw.db = nil
        mw.listeners = nil
    })
}
```

---

## Focus Events

### OnFocus

```go
window.OnFocus(func() {
    fmt.Println("Window gained focus")

    updateTitleBar(true)
    refreshContent()
    app.Event.Emit("window-focused", window.ID())
})
```

Use cases: update UI appearance, refresh data, resume operations, coordinate with other windows.

### OnBlur

```go
window.OnBlur(func() {
    fmt.Println("Window lost focus")

    updateTitleBar(false)
    pauseAnimations()
    saveCurrentState()
})
```

Use cases: update UI appearance, pause operations, save state, reduce resource usage.

Example — focus-aware UI:

```go
type FocusAwareWindow struct {
    window  *application.WebviewWindow
    focused bool
}

func (fw *FocusAwareWindow) Setup() {
    fw.window.OnFocus(func() {
        fw.focused = true
        fw.window.EmitEvent("update-theme", "active")
    })

    fw.window.OnBlur(func() {
        fw.focused = false
        fw.window.EmitEvent("update-theme", "inactive")
    })
}
```

---

## State Change Events

### OnMinimise / OnUnMinimise

```go
window.OnMinimise(func() {
    fmt.Println("Window minimised")
    pauseRendering()
    saveWindowState()
})

window.OnUnMinimise(func() {
    fmt.Println("Window restored from minimised")
    resumeRendering()
    refreshContent()
})
```

Use cases: pause/resume operations, save/restore state, reduce resource usage.

### OnMaximise / OnUnMaximise

```go
window.OnMaximise(func() {
    window.EmitEvent("layout-mode", "maximised")
    updateMaximiseButton("restore")
})

window.OnUnMaximise(func() {
    window.EmitEvent("layout-mode", "normal")
    updateMaximiseButton("maximise")
})
```

Use cases: adjust layout, update UI, save window state.

### OnFullscreen / OnUnFullscreen

```go
window.OnFullscreen(func() {
    window.EmitEvent("chrome-visibility", false)
    window.EmitEvent("layout-mode", "fullscreen")
})

window.OnUnFullscreen(func() {
    window.EmitEvent("chrome-visibility", true)
    window.EmitEvent("layout-mode", "normal")
})
```

Use cases: show/hide UI elements, adjust layout, update controls, save preferences.

---

## Position and Size Events

### OnMove

```go
window.OnMove(func(x, y int) {
    fmt.Printf("Window moved to: %d, %d\n", x, y)

    saveWindowPosition(x, y)
    updateRelatedWindowPositions(x, y)
})
```

Use cases: save window position, update related windows, snap to edges, multi-monitor handling.

### OnResize

```go
window.OnResize(func(width, height int) {
    fmt.Printf("Window resized to: %dx%d\n", width, height)

    saveWindowSize(width, height)
    window.EmitEvent("window-size", map[string]int{
        "width":  width,
        "height": height,
    })
})
```

Use cases: save window size, adjust layout, responsive design.

Responsive layout example:

```go
window.OnResize(func(width, height int) {
    var layout string

    if width < 600 {
        layout = "compact"
    } else if width < 1200 {
        layout = "normal"
    } else {
        layout = "wide"
    }

    window.EmitEvent("layout-changed", layout)
})
```

---

## Complete Example

```go
package main

import (
    "encoding/json"
    "fmt"
    "os"
    "github.com/wailsapp/wails/v3/pkg/application"
)

type WindowState struct {
    X          int  `json:"x"`
    Y          int  `json:"y"`
    Width      int  `json:"width"`
    Height     int  `json:"height"`
    Maximised  bool `json:"maximised"`
    Fullscreen bool `json:"fullscreen"`
}

type ManagedWindow struct {
    app    *application.Application
    window *application.WebviewWindow
    state  WindowState
    dirty  bool
}

func main() {
    app := application.New(application.Options{Name: "Event Demo"})

    mw := &ManagedWindow{app: app}
    mw.CreateWindow()
    mw.LoadState()
    mw.SetupEventHandlers()

    app.Run()
}

func (mw *ManagedWindow) CreateWindow() {
    mw.window = mw.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "main",
        Title:  "Event Demo",
        Width:  800,
        Height: 600,
    })
}

func (mw *ManagedWindow) SetupEventHandlers() {
    mw.window.OnFocus(func() {
        mw.window.EmitEvent("focus-state", true)
    })

    mw.window.OnBlur(func() {
        mw.window.EmitEvent("focus-state", false)
    })

    mw.window.OnMinimise(func() {
        mw.SaveState()
    })

    mw.window.OnUnMinimise(func() {
        fmt.Println("Window restored")
    })

    mw.window.OnMaximise(func() {
        mw.state.Maximised = true
        mw.dirty = true
    })

    mw.window.OnUnMaximise(func() {
        mw.state.Maximised = false
        mw.dirty = true
    })

    mw.window.OnFullscreen(func() {
        mw.state.Fullscreen = true
        mw.dirty = true
    })

    mw.window.OnUnFullscreen(func() {
        mw.state.Fullscreen = false
        mw.dirty = true
    })

    mw.window.OnMove(func(x, y int) {
        mw.state.X = x
        mw.state.Y = y
        mw.dirty = true
    })

    mw.window.OnResize(func(width, height int) {
        mw.state.Width = width
        mw.state.Height = height
        mw.dirty = true
    })

    mw.window.OnClose(func() bool {
        if mw.dirty {
            mw.SaveState()
        }
        return true
    })

    mw.window.OnDestroy(func() {
        if mw.dirty {
            mw.SaveState()
        }
    })
}

func (mw *ManagedWindow) LoadState() {
    data, err := os.ReadFile("window-state.json")
    if err != nil {
        return
    }

    if err := json.Unmarshal(data, &mw.state); err != nil {
        return
    }

    mw.window.SetPosition(mw.state.X, mw.state.Y)
    mw.window.SetSize(mw.state.Width, mw.state.Height)

    if mw.state.Maximised {
        mw.window.Maximise()
    }

    if mw.state.Fullscreen {
        mw.window.Fullscreen()
    }
}

func (mw *ManagedWindow) SaveState() {
    data, err := json.Marshal(mw.state)
    if err != nil {
        return
    }

    os.WriteFile("window-state.json", data, 0644)
    mw.dirty = false

    fmt.Println("Window state saved")
}
```

---

## Event Coordination

### Cross-Window Events

```go
mainWindow.OnFocus(func() {
    app.Event.Emit("main-window-focused", nil)
})

app.Event.On("main-window-focused", func(event *application.WailsEvent) {
    updateRelativeToMain()
})
```

### Event Chains

```go
window.OnMaximise(func() {
    saveWindowState()
    window.EmitEvent("layout-changed", "maximised")
    app.Event.Emit("window-maximised", window.ID())
})
```

### Debounced Events

```go
var resizeTimer *time.Timer

window.OnResize(func(width, height int) {
    if resizeTimer != nil {
        resizeTimer.Stop()
    }

    resizeTimer = time.AfterFunc(500*time.Millisecond, func() {
        saveWindowSize(width, height)
    })
})
```

---

## Best Practices

### Do

- Save state on close — restore window position/size
- Clean up on destroy — release resources
- Debounce frequent events — resize and move
- Handle focus changes — update UI appropriately
- Coordinate windows — use events for communication
- Test all events — ensure handlers work correctly

### Don't

- Don't block event handlers — keep them fast
- Don't forget cleanup — memory leaks
- Don't ignore errors — log or handle them
- Don't save on every event — debounce first
- Don't create circular events — infinite loops
- Don't forget platform differences

---

## Troubleshooting

**`OnClose` not firing:** you're using `window.Destroy()` instead of `window.Close()`. Only `Close()` triggers `OnClose`.

**Events not firing:** the handler was registered after the event already occurred. Register handlers immediately after creation.

**Memory leaks:** not cleaning up in `OnDestroy`. Always call `closeResources()` and `removeReferences()` there.

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples)
