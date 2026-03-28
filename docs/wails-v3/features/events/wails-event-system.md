# Wails v3 Event System

Communicate between components with the event system.

---

## Overview

Wails provides a **unified event system** for pub/sub communication. Emit events from anywhere, listen from anywhere—Go to JavaScript, JavaScript to Go, window to window—enabling decoupled architecture with typed events and lifecycle hooks.

---

## Quick Start

**Go (emit):**

```go
app.Event.Emit("user-logged-in", map[string]interface{}{
    "userId": 123,
    "name": "Alice",
})
```

**JavaScript (listen):**

```javascript
import { Events } from '@wailsio/runtime'

Events.On("user-logged-in", (event) => {
    console.log(`User ${event.data.name} logged in`)
})
```

---

## Event Types

### Custom Events

```go
// Emit from Go
app.Event.Emit("order-created", order)
app.Event.Emit("payment-processed", payment)
app.Event.Emit("notification", message)
```

```javascript
// Listen in JavaScript
Events.On("order-created", handleOrder)
Events.On("payment-processed", handlePayment)
Events.On("notification", showNotification)
```

### System Events

```go
import "github.com/wailsapp/wails/v3/pkg/events"

// Theme changes
app.Event.OnApplicationEvent(events.Common.ThemeChanged, func(e *application.ApplicationEvent) {
    if e.Context().IsDarkMode() {
        app.Logger.Info("Dark mode enabled")
    }
})

// Application lifecycle
app.Event.OnApplicationEvent(events.Common.ApplicationStarted, func(e *application.ApplicationEvent) {
    app.Logger.Info("Application started")
})
```

### Window Events

```go
window.OnWindowEvent(events.Common.WindowFocus, func(e *application.WindowEvent) {
    app.Logger.Info("Window focused")
})

window.OnWindowEvent(events.Common.WindowClosing, func(e *application.WindowEvent) {
    app.Logger.Info("Window closing")
})
```

---

## Emitting Events

### From Go

```go
// Basic emit
app.Event.Emit("event-name", data)

// String
app.Event.Emit("message", "Hello")

// Number
app.Event.Emit("count", 42)

// Struct
app.Event.Emit("user", User{ID: 1, Name: "Alice"})

// Map
app.Event.Emit("config", map[string]interface{}{
    "theme": "dark",
    "fontSize": 14,
})

// Array
app.Event.Emit("items", []string{"a", "b", "c"})

// To specific window
window.EmitEvent("window-specific-event", data)
```

### From JavaScript

```javascript
import { Events } from '@wailsio/runtime'

// Emit to Go
Events.Emit("button-clicked", { buttonId: "submit" })

// Emit to all windows
Events.Emit("broadcast-message", "Hello everyone")
```

---

## Listening to Events

### In Go

```go
// Application events
app.Event.On("custom-event", func(e *application.CustomEvent) {
    data := e.Data
    // Handle event
})

// With type assertion
app.Event.On("user-updated", func(e *application.CustomEvent) {
    user := e.Data.(User)
    app.Logger.Info("User updated", "name", user.Name)
})

// Multiple handlers
app.Event.On("order-created", logOrder)
app.Event.On("order-created", sendEmail)
app.Event.On("order-created", updateInventory)
```

### In JavaScript

```javascript
import { Events } from '@wailsio/runtime'

// Basic listener
Events.On("event-name", (event) => {
    console.log("Event received:", event.data)
})

// With cleanup
const unsubscribe = Events.On("event-name", handleEvent)
unsubscribe() // Stop listening

// Multiple handlers
Events.On("data-updated", updateUI)
Events.On("data-updated", saveToCache)
Events.On("data-updated", logChange)

// One-time handler
Events.Once("data-updated", updateVariable)
```

---

## System Events

### Application Events — Common (Cross-Platform)

```go
import "github.com/wailsapp/wails/v3/pkg/events"

// Application started
app.Event.OnApplicationEvent(events.Common.ApplicationStarted, func(e *application.ApplicationEvent) {
    app.Logger.Info("App started")
})

// Theme changed
app.Event.OnApplicationEvent(events.Common.ThemeChanged, func(e *application.ApplicationEvent) {
    isDark := e.Context().IsDarkMode()
    app.Event.Emit("theme-changed", isDark)
})

// File opened
app.Event.OnApplicationEvent(events.Common.ApplicationOpenedWithFile, func(e *application.ApplicationEvent) {
    filePath := e.Context().OpenedFile()
    openFile(filePath)
})
```

### Application Events — macOS

```go
app.Event.OnApplicationEvent(events.Mac.ApplicationDidBecomeActive, func(e *application.ApplicationEvent) {
    app.Logger.Info("App became active")
})

app.Event.OnApplicationEvent(events.Mac.ApplicationWillTerminate, func(e *application.ApplicationEvent) {
    cleanup()
})
```

### Application Events — Windows

```go
app.Event.OnApplicationEvent(events.Windows.APMPowerStatusChange, func(e *application.ApplicationEvent) {
    app.Logger.Info("Power status changed")
})

app.Event.OnApplicationEvent(events.Windows.APMSuspend, func(e *application.ApplicationEvent) {
    saveState()
})
```

### Application Events — Linux

```go
app.Event.OnApplicationEvent(events.Linux.ApplicationStartup, func(e *application.ApplicationEvent) {
    app.Logger.Info("App starting")
})

app.Event.OnApplicationEvent(events.Linux.SystemThemeChanged, func(e *application.ApplicationEvent) {
    updateTheme()
})
```

### Window Events — Common

```go
// Focus
window.OnWindowEvent(events.Common.WindowFocus, func(e *application.WindowEvent) {
    app.Logger.Info("Window focused")
})

// Blur
window.OnWindowEvent(events.Common.WindowBlur, func(e *application.WindowEvent) {
    app.Logger.Info("Window blurred")
})

// Closing (can cancel)
window.OnWindowEvent(events.Common.WindowClosing, func(e *application.WindowEvent) {
    if hasUnsavedChanges() {
        e.Cancel()
    }
})

// Closed
window.OnWindowEvent(events.Common.WindowClosed, func(e *application.WindowEvent) {
    cleanup()
})
```

---

## Event Hooks

Hooks run **before** standard listeners and can **cancel** events:

```go
// Hook - runs first, can cancel
window.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
    if hasUnsavedChanges() {
        result := showConfirmdialog("Unsaved changes. Close anyway?")
        if result != "yes" {
            e.Cancel()
        }
    }
})

// Standard listener - runs after hooks
window.OnWindowEvent(events.Common.WindowClosing, func(e *application.WindowEvent) {
    app.Logger.Info("Window closing")
})
```

### Hooks vs Standard Listeners

| Feature | Hooks | Standard Listeners |
|---|---|---|
| Execution order | First, in registration order | After hooks, no guaranteed order |
| Blocking | Synchronous, blocks next hook | Asynchronous, non-blocking |
| Can cancel | Yes | No (already propagated) |
| Use case | Control flow, validation | Logging, side effects |

---

## Event Patterns

### Pub/Sub Pattern

```go
type OrderService struct {
    app *application.Application
}

func (o *OrderService) CreateOrder(items []Item) (*Order, error) {
    order := &Order{Items: items}
    if err := o.saveOrder(order); err != nil {
        return nil, err
    }
    o.app.Event.Emit("order-created", order)
    return order, nil
}

app.Event.On("order-created", func(e *application.CustomEvent) {
    order := e.Data.(*Order)
    sendConfirmationEmail(order)
})

app.Event.On("order-created", func(e *application.CustomEvent) {
    order := e.Data.(*Order)
    updateInventory(order)
})
```

### Request/Response Pattern

> **Note:** For request/response, **bindings are better**. Use events for notifications.

```go
// Backend responds to frontend request
app.Event.On("get-user-data", func(e *application.CustomEvent) {
    data := e.Data.(map[string]interface{})
    userId := int(data["userId"].(float64))
    user := getUserFromDB(userId)
    app.Event.Emit("user-data-response", user)
})
```

```javascript
// Frontend requests
Emit("get-user-data", { userId: 123 })

// Frontend receives response
Events.On("user-data-response", (event) => {
    displayUser(event.data)
})
```

### Broadcast Pattern

```go
// Go: broadcast to all windows
app.Event.Emit("global-notification", "System update available")
```

```javascript
// Each window handles it
Events.On("global-notification", (event) => {
    showNotification(event.data)
})
```

### Event Aggregation

```go
type EventAggregator struct {
    events []Event
    mu     sync.Mutex
}

func (ea *EventAggregator) Add(event Event) {
    ea.mu.Lock()
    defer ea.mu.Unlock()
    ea.events = append(ea.events, event)
    if len(ea.events) >= 100 {
        app.Event.Emit("event-batch", ea.events)
        ea.events = nil
    }
}
```

---

## Complete Example

**Go:**

```go
package main

import (
    "github.com/wailsapp/wails/v3/pkg/application"
    "github.com/wailsapp/wails/v3/pkg/events"
)

type NotificationService struct {
    app *application.Application
}

func (n *NotificationService) Notify(message string) {
    n.app.Event.Emit("notification", map[string]interface{}{
        "message":   message,
        "timestamp": time.Now(),
    })
}

func main() {
    app := application.New(application.Options{
        Name: "Event Demo",
    })

    notifService := &NotificationService{app: app}

    app.Event.OnApplicationEvent(events.Common.ThemeChanged, func(e *application.ApplicationEvent) {
        isDark := e.Context().IsDarkMode()
        app.Event.Emit("theme-changed", isDark)
    })

    app.Event.On("user-action", func(e *application.CustomEvent) {
        data := e.Data.(map[string]interface{})
        action := data["action"].(string)
        app.Logger.Info("User action", "action", action)
        notifService.Notify("Action completed: " + action)
    })

    window := app.Window.New()

    window.OnWindowEvent(events.Common.WindowFocus, func(e *application.WindowEvent) {
        app.Event.Emit("window-focused", window.Name())
    })

    window.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
        app.Event.Emit("confirm-close", nil)
        e.Cancel()
    })

    app.Run()
}
```

**JavaScript:**

```javascript
import { Events } from '@wailsio/runtime'

Events.On("notification", (event) => {
    showNotification(event.data.message)
})

Events.On("theme-changed", (event) => {
    document.body.classList.toggle('dark', event.data)
})

Events.On("window-focused", (event) => {
    console.log(`Window ${event.data} focused`)
})

Events.On("confirm-close", (event) => {
    if (confirm("Close window?")) {
        Emit("close-confirmed", true)
    }
})

document.getElementById('button').addEventListener('click', () => {
    Emit("user-action", { action: "button-clicked" })
})
```

---

## Best Practices

### Do

- Use events for **notifications** (one-way communication)
- Use bindings for **requests** (two-way communication)
- Keep event names consistent — use **kebab-case**
- Document event data — what fields are included?
- **Unsubscribe when done** to prevent memory leaks
- Use hooks for **validation** and control flow

### Don't

- Don't use events for RPC — use bindings instead
- Don't emit too frequently — batch if needed
- Don't block in handlers — keep them fast
- Don't forget to unsubscribe — memory leaks
- Don't use events for large data — use bindings
- Don't create event loops — A emits B, B emits A

---

## Resources

- [Discord](https://discord.gg/JDdSxwjhGf)
- [Event Examples on GitHub](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/events)
