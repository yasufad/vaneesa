# Events Guide

A practical guide to using events in Wails v3 for application communication and lifecycle management.

**NOTE:** This guide is a work in progress.

## Understanding Wails Events

Events are the heartbeat of communication in Wails applications. They allow different parts of your application to talk to each other without being tightly coupled. This is particularly useful for:

- **Responding to window changes:** Know when your window is minimized, maximized, or moved
- **Handling system events:** React to theme changes or power events
- **Custom application logic:** Create your own events for features like data updates or user actions
- **Cross-component communication:** Let different parts of your app communicate without direct dependencies

## Event Naming Convention

All Wails events follow a namespace pattern to clearly indicate their origin:

- `common:` - Cross-platform events that work on Windows, macOS, and Linux
- `windows:` - Windows-specific events
- `mac:` - macOS-specific events
- `linux:` - Linux-specific events

For example:
- `common:WindowFocus` - Window gained focus (works everywhere)
- `windows:APMSuspend` - System is suspending (Windows only)
- `mac:ApplicationDidBecomeActive` - App became active (macOS only)

## Getting Started with Events

### Listening to Events (Frontend)

The most common use case is listening for events in your frontend code:

```javascript
import { Events } from '@wailsio/runtime';

// Listen for when the window gains focus
Events.On('common:WindowFocus', () => {
    console.log('Window is now focused!');
});

// Listen for theme changes
Events.On('common:ThemeChanged', (event) => {
    console.log('Theme changed:', event.data);
});

// Listen for custom events from your Go backend
Events.On('my-app:data-updated', (event) => {
    console.log('Data updated:', event.data);
});
```

### Emitting Events (Backend)

From your Go code, you can emit events that your frontend can listen to:

```go
package main

import (
    "github.com/wailsapp/wails/v3/pkg/application"
    "time"
)

func (s *Service) UpdateData() {
    // Do some data processing...

    // Notify the frontend
    app := application.Get()
    app.Event.Emit("my-app:data-updated",
        map[string]interface{}{
            "timestamp": time.Now(),
            "count": 42,
        },
    )
}
```

### Emitting Events (Frontend)

While not as commonly used, you can also emit events from your frontend that your Go code can listen to:

```javascript
import { Events } from '@wailsio/runtime';

// Event without data
Events.Emit('myapp:close-window')

// Event with data
Events.Emit('myapp:disconnect-requested', 'id-123')
```

### Removing Event Listeners

Always clean up your event listeners when they're no longer needed:

```javascript
import { Events } from '@wailsio/runtime';

// Store the handler reference
const focusHandler = () => {
    console.log('Window focused');
};

// Add the listener
Events.On('common:WindowFocus', focusHandler);

// Later, remove it when no longer needed
Events.Off('common:WindowFocus', focusHandler);

// Or remove all listeners for an event
Events.Off('common:WindowFocus');
```

## Common Use Cases

### 1. Pause/Resume on Window Focus

Many applications need to pause certain activities when the window loses focus:

```javascript
import { Events } from '@wailsio/runtime';

let animationRunning = true;

Events.On('common:WindowLostFocus', () => {
    animationRunning = false;
    pauseBackgroundTasks();
});

Events.On('common:WindowFocus', () => {
    animationRunning = true;
    resumeBackgroundTasks();
});
```

### 2. Responding to Theme Changes

```javascript
import { Events } from '@wailsio/runtime';

Events.On('common:ThemeChanged', (event) => {
    const theme = event.data;
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
});
```
