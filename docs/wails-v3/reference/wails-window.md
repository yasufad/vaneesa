# Window API

Complete reference for the Window API.

## Overview

The Window API provides methods to control window appearance, behaviour, and lifecycle. Access through window instances or the Window manager.

**Common operations:**
- Create and show windows
- Control size, position, and state
- Handle window events
- Manage window content
- Configure appearance and behaviour

## Visibility

### Show()

Shows the window. If the window was hidden, it becomes visible.

```go
func (w *Window) Show()
```

### Hide()

Hides the window without closing it. The window remains in memory and can be shown again.

```go
func (w *Window) Hide()
```

**Use cases:**
- System tray applications that hide to tray
- Wizard flows where windows are reused
- Temporary hiding during operations

### Close()

Closes the window. This triggers the `WindowClosing` event.

```go
func (w *Window) Close()
```

**Note:** If a registered hook calls `event.Cancel()`, the close will be prevented.

## Window Properties

### SetTitle()

Sets the window title bar text.

```go
func (w *Window) SetTitle(title string)
```

### Name()

Returns the window's unique name identifier.

```go
func (w *Window) Name() string
```

## Size and Position

### SetSize()

Sets the window dimensions in pixels.

```go
func (w *Window) SetSize(width, height int)
```

### Size()

Returns the current window dimensions.

```go
func (w *Window) Size() (width, height int)
```

### SetMinSize() / SetMaxSize()

Sets minimum and maximum window dimensions.

```go
func (w *Window) SetMinSize(width, height int)
func (w *Window) SetMaxSize(width, height int)
```

### SetPosition()

Sets the window position relative to the top-left corner of the screen.

```go
func (w *Window) SetPosition(x, y int)
```

### Position()

Returns the current window position.

```go
func (w *Window) Position() (x, y int)
```

### Centre()

Centers the window on the screen.

```go
func (w *Window) Centre()
```

**Note:** Centers on the primary monitor. For multi-monitor setups, see screen APIs.

### SetFocus()

Brings the window to the front and gives it keyboard focus.

```go
func (w *Window) SetFocus()
```

## Window State

### Minimise() / UnMinimise()

Minimizes the window to the taskbar/dock or restores it.

```go
func (w *Window) Minimise()
func (w *Window) UnMinimise()
```

### Maximise() / UnMaximise()

Maximizes the window to fill the screen or restores it to its previous size.

```go
func (w *Window) Maximise()
func (w *Window) UnMaximise()
```

### Fullscreen() / UnFullscreen()

Enters or exits fullscreen mode.

```go
func (w *Window) Fullscreen()
func (w *Window) UnFullscreen()
```

### IsMinimised() / IsMaximised() / IsFullscreen()

Checks the current window state.

```go
func (w *Window) IsMinimised() bool
func (w *Window) IsMaximised() bool
func (w *Window) IsFullscreen() bool
```

## Window Content

### SetURL()

Navigates to a specific URL within the window.

```go
func (w *Window) SetURL(url string)
```

### SetHTML()

Sets the window content directly from an HTML string.

```go
func (w *Window) SetHTML(html string)
```

**Use cases:**
- Dynamic content generation
- Simple windows without frontend build process
- Error pages or splash screens

### Reload()

Reloads the current window content.

```go
func (w *Window) Reload()
```

## Window Events

Wails provides two methods for handling window events:

- **OnWindowEvent()** - Listen to window events (cannot prevent them)
- **RegisterHook()** - Hook into window events (can prevent them by calling `event.Cancel()`)

### OnWindowEvent()

Registers a callback for window events.

```go
func (w *Window) OnWindowEvent(
    eventType events.WindowEventType,
    callback func(event *WindowEvent),
) func()
```

**Returns:** Cleanup function to remove the event listener

**Example:**
```go
import "github.com/wailsapp/wails/v3/pkg/events"

// Listen for window focus
window.OnWindowEvent(events.Common.WindowFocus, func(e *application.WindowEvent) {
    app.Logger.Info("Window gained focus")
})

// Listen for window resize
window.OnWindowEvent(events.Common.WindowDidResize, func(e *application.WindowEvent) {
    app.Logger.Info("Window resized")
})
```

**Common Window Events:**
- `events.Common.WindowClosing` - Window is about to close
- `events.Common.WindowFocus` - Window gained focus
- `events.Common.WindowLostFocus` - Window lost focus
- `events.Common.WindowDidMove` - Window moved
- `events.Common.WindowDidResize` - Window resized
- `events.Common.WindowMinimise` - Window minimized
- `events.Common.WindowMaximise` - Window maximized
- `events.Common.WindowFullscreen` - Window entered fullscreen

### RegisterHook()

Registers a hook for window events. Hooks run before listeners and can prevent the event by calling `event.Cancel()`.

```go
func (w *Window) RegisterHook(
    eventType events.WindowEventType,
    callback func(event *WindowEvent),
) func()
```

**Example - Prevent window close:**
```go
import "github.com/wailsapp/wails/v3/pkg/events"

window.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
    result, _ := app.Dialog.Question().
        SetTitle("Confirm Close").
        SetMessage("Are you sure you want to close this window?").
        SetButtons("Yes", "No").
        Show()

    if result == "No" {
        e.Cancel()  // Prevent window from closing
    }
})
```

**Example - Save before closing:**
```go
window.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
    if hasUnsavedChanges {
        result, _ := app.Dialog.Question().
            SetMessage("Save changes before closing?").
            SetButtons("Save", "Don't Save", "Cancel").
            Show()

        switch result {
        case "Save":
            saveData()
            // Allow close
        case "Don't Save":
            // Allow close
        case "Cancel":
            e.Cancel()  // Prevent close
        }
    }
})
```

### EmitEvent()

Emits a custom event to the window's frontend.

```go
func (w *Window) EmitEvent(name string, data ...interface{})
```

**Frontend (JavaScript):**
```javascript
import { Events } from '@wailsio/runtime'

Events.On('data-updated', (data) => {
    console.log('Count:', data.count)
})
```

## Other Methods

### SetEnabled()

Enables or disables user interaction with the window.

```go
func (w *Window) SetEnabled(enabled bool)
```

### SetBackgroundColour()

Sets the window background color (shown before content loads).

```go
func (w *Window) SetBackgroundColour(r, g, b, a uint8)
```

### SetResizable()

Controls whether the window can be resized by the user.

```go
func (w *Window) SetResizable(resizable bool)
```

### SetAlwaysOnTop()

Sets whether the window stays above other windows.

```go
func (w *Window) SetAlwaysOnTop(alwaysOnTop bool)
```

### Print()

Opens the native print dialog for the window content.

```go
func (w *Window) Print() error
```

### AttachModal()

Attaches a second Window as a sheet modal.

```go
func (w *Window) AttachModal(modalWindow Window)
```

**Platform support:**
- **macOS:** Full support (presents as a sheet)
- **Windows:** No support
- **Linux:** No support

## Platform-Specific Options

### Linux

Linux windows support the following platform-specific options via `LinuxWindow`:

#### MenuStyle

Controls how the application menu is displayed. This option is only available on GTK4 builds and is ignored on GTK3.

| Value | Description |
|-------|-------------|
| `LinuxMenuStyleMenuBar` | Traditional menu bar below the title bar (default) |
| `LinuxMenuStylePrimaryMenu` | Primary menu button in the header bar (GNOME style) |

**Example:**
```go
window := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Title: "My Application",
    Linux: application.LinuxWindow{
        MenuStyle: application.LinuxMenuStylePrimaryMenu,
    },
})
window.SetMenu(menu)
```

**Note:** The primary menu style displays a hamburger button in the header bar, following GNOME Human Interface Guidelines. This is the recommended style for modern GNOME applications.

## Complete Example

```go
package main

import (
    "github.com/wailsapp/wails/v3/pkg/application"
    "github.com/wailsapp/wails/v3/pkg/events"
)

func main() {
    app := application.New(application.Options{
        Name: "Window API Demo",
    })

    // Create window with options
    window := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:            "My Application",
        Width:            1024,
        Height:           768,
        MinWidth:         800,
        MinHeight:        600,
        BackgroundColour: application.NewRGB(255, 255, 255),
        URL:              "http://wails.localhost/",
    })

    // Configure window behavior
    window.SetResizable(true)
    window.SetMinSize(800, 600)
    window.SetMaxSize(1920, 1080)

    // Set up event hooks
    window.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
        // Confirm before closing
        result, _ := app.Dialog.Question().
            SetTitle("Confirm Close").
            SetMessage("Are you sure you want to close this window?").
            SetButtons("Yes", "No").
            Show()

        if result == "No" {
            e.Cancel()
        }
    })

    // Listen for window events
    window.OnWindowEvent(events.Common.WindowFocus, func(e *application.WindowEvent) {
        window.SetTitle("My Application (Active)")
    })

    window.OnWindowEvent(events.Common.WindowLostFocus, func(e *application.WindowEvent) {
        window.SetTitle("My Application")
    })

    // Position and show window
    window.Centre()
    window.Show()

    app.Run()
}
```
