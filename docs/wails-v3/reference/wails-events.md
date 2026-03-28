# Events API

Complete reference for the Events API.

## Overview

The Events API provides methods to emit and listen to events, enabling communication between different parts of your application.

**Event Types:**
- **Application Events** - App lifecycle events (startup, shutdown)
- **Window Events** - Window state changes (focus, blur, resize)
- **Custom Events** - User-defined events for app-specific communication

**Communication Patterns:**
- **Go to Frontend** - Emit events from Go, listen in JavaScript
- **Frontend to Go** - Not directly (use service bindings instead)
- **Frontend to Frontend** - Via Go or local runtime events
- **Window to Window** - Target specific windows or broadcast to all

## Event Methods (Go)

### app.Event.Emit()

Emits a custom event to all windows.

```go
func (em *EventManager) Emit(name string, data ...interface{})
```

**Example:**
```go
// Emit simple event
app.Event.Emit("user-logged-in")

// Emit with data
app.Event.Emit("data-updated", map[string]interface{}{
    "count": 42,
    "status": "success",
})
```

### app.Event.On()

Listens for custom events in Go.

```go
func (em *EventManager) On(name string, callback func(*CustomEvent)) func()
```

**Returns:** Cleanup function to remove the event listener

**Example:**
```go
// Listen for events
cleanup := app.Event.On("user-action", func(e *application.CustomEvent) {
    data := e.Data.(map[string]interface{})
    action := data["action"].(string)
    app.Logger.Info("User action", "action", action)
})

// Later, remove listener
cleanup()
```

### Window-Specific Events

Emit events to a specific window:

```go
// Emit to specific window
window.EmitEvent("notification", "Hello from Go!")

// Emit to all windows
app.Event.Emit("global-update", data)
```

## Event Methods (Frontend)

### On()

Listens for events from Go.

```javascript
import { Events } from '@wailsio/runtime'

Events.On(eventName, callback)
```

**Returns:** Cleanup function

### Once()

Listens for a single event occurrence.

```javascript
import { Events } from '@wailsio/runtime'

Events.Once(eventName, callback)
```

### Off()

Removes an event listener.

```javascript
import { Events } from '@wailsio/runtime'

Events.Off(eventName, callback)
```

### OffAll()

Removes all listeners for an event.

```javascript
import { Events } from '@wailsio/runtime'

Events.OffAll(eventName)
```

## Application Events

### app.Event.OnApplicationEvent()

Listens for application lifecycle events.

```go
func (em *EventManager) OnApplicationEvent(eventType ApplicationEventType, callback func(*ApplicationEvent)) func()
```

**Event Types:**
- `EventApplicationStarted` - Application has started
- `EventApplicationShutdown` - Application is shutting down
- `EventApplicationDebug` - Debug event (dev mode only)

**Example:**
```go
// Handle application startup
app.Event.OnApplicationEvent(application.EventApplicationStarted, func(e *application.ApplicationEvent) {
    app.Logger.Info("Application started")
})

// Handle application shutdown
app.Event.OnApplicationEvent(application.EventApplicationShutdown, func(e *application.ApplicationEvent) {
    app.Logger.Info("Application shutting down")
    database.Close()
    saveSettings()
})
```

## Window Events

### OnWindowEvent()

Listens for window-specific events.

```go
func (w *Window) OnWindowEvent(eventType WindowEventType, callback func(*WindowEvent)) func()
```

**Event Types:**
- `EventWindowFocus` - Window gained focus
- `EventWindowBlur` - Window lost focus
- `EventWindowClose` - Window is closing
- `EventWindowResize` - Window was resized
- `EventWindowMove` - Window was moved

**Example:**
```go
// Handle window focus
window.OnWindowEvent(application.EventWindowFocus, func(e *application.WindowEvent) {
    app.Logger.Info("Window focused")
})

// Handle window resize
window.OnWindowEvent(application.EventWindowResize, func(e *application.WindowEvent) {
    width, height := window.Size()
    app.Logger.Info("Window resized", "width", width, "height", height)
})
```

## Common Patterns

### Request/Response Pattern

Use this when you want to notify the frontend about the completion of backend operations.

**Go:**
```go
type DataService struct {
    app *application.Application
}

func (s *DataService) FetchData(query string) ([]Item, error) {
    items := fetchFromDatabase(query)

    // Emit event when done
    s.app.Event.Emit("data-fetched", map[string]interface{}{
        "query": query,
        "count": len(items),
    })

    return items, nil
}
```

**JavaScript:**
```javascript
import { FetchData } from './bindings/DataService'
import { Events } from '@wailsio/runtime'

// Listen for completion event
Events.On('data-fetched', (data) => {
    console.log(`Fetched ${data.count} items`)
    showNotification(`Found ${data.count} results`)
})

// Call service method
const items = await FetchData("search term")
displayItems(items)
```

### Progress Updates

Ideal for long-running operations like file uploads, batch processing, or video encoding.

**Go:**
```go
func (s *Service) ProcessFiles(files []string) error {
    total := len(files)

    for i, file := range files {
        processFile(file)

        // Emit progress event
        s.app.Event.Emit("progress", map[string]interface{}{
            "current": i + 1,
            "total":   total,
            "percent": float64(i+1) / float64(total) * 100,
            "file":    file,
        })
    }

    s.app.Event.Emit("processing-complete")
    return nil
}
```

**JavaScript:**
```javascript
import { Events } from '@wailsio/runtime'

// Update progress bar
Events.On('progress', (data) => {
    progressBar.style.width = `${data.percent}%`
    statusText.textContent = `Processing ${data.file}... (${data.current}/${data.total})`
})

// Handle completion
Events.Once('processing-complete', () => {
    progressBar.style.width = '100%'
    statusText.textContent = 'Complete!'
})
```

### Multi-Window Communication

Perfect for applications with multiple windows like settings panels or dashboards.

**Go:**
```go
// Broadcast to all windows
app.Event.Emit("theme-changed", "dark")

// Send to specific window
preferencesWindow.EmitEvent("settings-updated", settings)

// Window-specific listener
window1.OnEvent("request-data", func(e *application.CustomEvent) {
    window1.EmitEvent("data-response", data)
})
```

**JavaScript:**
```javascript
import { Events } from '@wailsio/runtime'

// Listen in any window
Events.On('theme-changed', (theme) => {
    document.body.className = theme
})
```

### State Synchronization

Use when you need to keep frontend and backend state in sync.

**Go:**
```go
type StateService struct {
    app   *application.Application
    state map[string]interface{}
    mu    sync.RWMutex
}

func (s *StateService) UpdateState(key string, value interface{}) {
    s.mu.Lock()
    s.state[key] = value
    s.mu.Unlock()

    // Notify all windows
    s.app.Event.Emit("state-updated", map[string]interface{}{
        "key":   key,
        "value": value,
    })
}
```

**JavaScript:**
```javascript
import { Events } from '@wailsio/runtime'

// Keep local state in sync
Events.On('state-updated', (data) => {
    localState[data.key] = data.value
    updateUI(data.key, data.value)
})
```

### Event-Driven Notifications

Best for displaying user feedback like success confirmations or error alerts.

**Go:**
```go
type NotificationService struct {
    app *application.Application
}

func (s *NotificationService) Success(message string) {
    s.app.Event.Emit("notification", map[string]interface{}{
        "type":    "success",
        "message": message,
    })
}

func (s *NotificationService) Error(message string) {
    s.app.Event.Emit("notification", map[string]interface{}{
        "type":    "error",
        "message": message,
    })
}
```

**JavaScript:**
```javascript
import { Events } from '@wailsio/runtime'

// Unified notification handler
Events.On('notification', (data) => {
    const toast = document.createElement('div')
    toast.className = `toast toast-${data.type}`
    toast.textContent = data.message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
})
```

## Complete Example

**Go:**
```go
package main

import (
    "sync"
    "time"
    "github.com/wailsapp/wails/v3/pkg/application"
)

type EventDemoService struct {
    app *application.Application
    mu  sync.Mutex
}

func NewEventDemoService(app *application.Application) *EventDemoService {
    service := &EventDemoService{app: app}

    // Listen for custom events
    app.Event.On("user-action", func(e *application.CustomEvent) {
        data := e.Data.(map[string]interface{})
        app.Logger.Info("User action received", "data", data)
    })

    return service
}

func (s *EventDemoService) StartLongTask() {
    go func() {
        s.app.Event.Emit("task-started")

        for i := 1; i <= 10; i++ {
            time.Sleep(500 * time.Millisecond)

            s.app.Event.Emit("task-progress", map[string]interface{}{
                "step":    i,
                "total":   10,
                "percent": i * 10,
            })
        }

        s.app.Event.Emit("task-completed", map[string]interface{}{
            "message": "Task finished successfully!",
        })
    }()
}

func main() {
    app := application.New(application.Options{
        Name: "Event Demo",
    })

    // Handle application lifecycle
    app.Event.OnApplicationEvent(application.EventApplicationStarted, func(e *application.ApplicationEvent) {
        app.Logger.Info("Application started!")
    })

    app.Event.OnApplicationEvent(application.EventApplicationShutdown, func(e *application.ApplicationEvent) {
        app.Logger.Info("Application shutting down...")
    })

    // Register service
    service := NewEventDemoService(app)
    app.RegisterService(application.NewService(service))

    // Create window
    window := app.Window.New()

    // Handle window events
    window.OnWindowEvent(events.Common.WindowFocus, func(e *application.WindowEvent) {
        window.EmitEvent("window-state", "focused")
    })

    window.Show()
    app.Run()
}
```

**JavaScript:**
```javascript
import { Events } from '@wailsio/runtime'
import { StartLongTask } from './bindings/EventDemoService'

// Task events
Events.On('task-started', () => {
    console.log('Task started...')
})

Events.On('task-progress', (data) => {
    const progressBar = document.getElementById('progress')
    progressBar.style.width = `${data.percent}%`
})

Events.Once('task-completed', (data) => {
    console.log('Task completed!', data.message)
})

// Trigger long task
document.getElementById('startTask').addEventListener('click', async () => {
    await StartLongTask()
})
```

## Built-in Events

Wails provides built-in system events for application and window lifecycle.

### Common Events vs Platform-Native Events

**Common Events** (`events.Common.*`) are cross-platform abstractions that work consistently across macOS, Windows, and Linux. These are the events you should use in your application for maximum portability.

**Platform-Native Events** (`events.Mac.*`, `events.Windows.*`, `events.Linux.*`) are the underlying OS-specific events. Use these only when you need platform-specific functionality.

**How They Work:**

```go
import "github.com/wailsapp/wails/v3/pkg/events"

// RECOMMENDED: Use Common Events for cross-platform code
window.OnWindowEvent(events.Common.WindowClosing, func(e *application.WindowEvent) {
    // This works on all platforms
})

// Platform-specific events for advanced use cases
window.OnWindowEvent(events.Mac.WindowWillClose, func(e *application.WindowEvent) {
    // macOS-specific "will close" event
})
```

**Event Mapping:**

Platform-native events are automatically mapped to Common Events:

- macOS: `events.Mac.WindowShouldClose` → `events.Common.WindowClosing`
- Windows: `events.Windows.WindowClosing` → `events.Common.WindowClosing`
- Linux: `events.Linux.WindowDeleteEvent` → `events.Common.WindowClosing`

### Application Events

| Event | Description | When Emitted | Cancellable |
|-------|-------------|--------------|-------------|
| `ApplicationOpenedWithFile` | Application opened with a file | When app is launched with a file | No |
| `ApplicationStarted` | Application has finished launching | After app initialization is complete | No |
| `ApplicationLaunchedWithUrl` | Application launched with a URL | When app is launched via URL scheme | No |
| `ThemeChanged` | System theme changed | When OS theme switches between light/dark | No |

### Window Events

| Event | Description | When Emitted | Cancellable |
|-------|-------------|--------------|-------------|
| `WindowClosing` | Window is about to close | Before window closes | Yes |
| `WindowDidMove` | Window moved to new position | After window position changes | No |
| `WindowDidResize` | Window was resized | After window size changes | No |
| `WindowDPIChanged` | Window DPI scaling changed | When moving between monitors with different DPI | No |
| `WindowFilesDropped` | Files dropped via native OS drag-drop | After files are dropped from OS | No |
| `WindowFocus` | Window gained focus | When window becomes active | No |
| `WindowFullscreen` | Window entered fullscreen | After entering fullscreen | No |
| `WindowHide` | Window was hidden | After Hide() or window becomes occluded | No |
| `WindowLostFocus` | Window lost focus | When window becomes inactive | No |
| `WindowMaximise` | Window was maximized | After Maximise() or user maximizes | Yes (macOS) |
| `WindowMinimise` | Window was minimized | After Minimise() or user minimizes | Yes (macOS) |
| `WindowRestore` | Window restored from min/max state | After Restore() | No |
| `WindowRuntimeReady` | Wails runtime loaded and ready | When JavaScript runtime initialization completes | No |
| `WindowShow` | Window became visible | After Show() or window becomes visible | No |
| `WindowUnFullscreen` | Window exited fullscreen | After exiting fullscreen | No |
| `WindowUnMaximise` | Window exited maximized state | After UnMaximise() | Yes (macOS) |
| `WindowUnMinimise` | Window exited minimized state | After UnMinimise()/Restore() | Yes (macOS) |

**Important Notes:**

- **WindowRuntimeReady** is critical - wait for this event before emitting events to the frontend
- **WindowDidMove** and **WindowDidResize** are debounced (50ms default) to prevent event flooding
- **Cancellable events** can be prevented by calling `event.Cancel()` in a `RegisterHook()` handler

## Event Naming Conventions

```go
// Good - descriptive and specific
app.Event.Emit("user:logged-in", user)
app.Event.Emit("data:fetch:complete", results)
app.Event.Emit("ui:theme:changed", theme)

// Bad - vague and unclear
app.Event.Emit("event1", data)
app.Event.Emit("update", stuff)
```

## Performance Considerations

### Debouncing High-Frequency Events

```go
type Service struct {
    app            *application.Application
    lastEmit       time.Time
    debounceWindow time.Duration
}

func (s *Service) EmitWithDebounce(event string, data interface{}) {
    now := time.Now()
    if now.Sub(s.lastEmit) < s.debounceWindow {
        return // Skip this emission
    }

    s.app.Event.Emit(event, data)
    s.lastEmit = now
}
```

### Throttling Events

```javascript
import { Events } from '@wailsio/runtime'

let lastUpdate = 0
const throttleMs = 100

Events.On('high-frequency-event', (data) => {
    const now = Date.now()
    if (now - lastUpdate < throttleMs) {
        return // Skip this update
    }

    processUpdate(data)
    lastUpdate = now
})
```
