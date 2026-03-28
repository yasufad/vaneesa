# Notifications

Display native system notifications with action buttons and text input.

Wails provides a comprehensive cross-platform notification system for desktop applications. This service allows you to display native system notifications, with support for interactive elements like action buttons and text input fields.

---

## Basic Usage

### Creating the Service

```go
import "github.com/wailsapp/wails/v3/pkg/application"
import "github.com/wailsapp/wails/v3/pkg/services/notifications"

notifier := notifications.New()

app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(notifier),
    },
})
```

---

## Notification Authorization

Notifications on macOS require user authorization. Request and check authorization:

```go
authorized, err := notifier.CheckNotificationAuthorization()
if err != nil {
    // Handle authorization error
}
if authorized {
    // Send notifications
} else {
    authorized, err = notifier.RequestNotificationAuthorization()
}
```

On Windows and Linux this always returns `true`.

---

## Notification Types

### Basic Notifications

Send a basic notification with a unique ID, title, optional subtitle (macOS and Linux), and body text:

```go
notifier.SendNotification(notifications.NotificationOptions{
    ID:       "unique-id",
    Title:    "New Calendar Invite",
    Subtitle: "From: Jane Doe", // Optional
    Body:     "Tap to view the event",
})
```

### Interactive Notifications

Send a notification with action buttons and text inputs. These require a notification category to be registered first:

```go
categoryID := "unique-category-id"

category := notifications.NotificationCategory{
    ID: categoryID,
    Actions: []notifications.NotificationAction{
        {
            ID:    "OPEN",
            Title: "Open",
        },
        {
            ID:          "ARCHIVE",
            Title:       "Archive",
            Destructive: true, // macOS-specific
        },
    },
    HasReplyField:    true,
    ReplyPlaceholder: "message...",
    ReplyButtonTitle: "Reply",
}

notifier.RegisterNotificationCategory(category)

notifier.SendNotificationWithActions(notifications.NotificationOptions{
    ID:         "unique-id",
    Title:      "New Message",
    Subtitle:   "From: Jane Doe",
    Body:       "Are you able to make it?",
    CategoryID: categoryID,
})
```

---

## Notification Responses

Process user interactions with notifications:

```go
notifier.OnNotificationResponse(func(result notifications.NotificationResult) {
    response := result.Response
    fmt.Printf("Notification %s was actioned with: %s\n", response.ID, response.ActionIdentifier)

    if response.ActionIdentifier == "TEXT_REPLY" {
        fmt.Printf("User replied: %s\n", response.UserText)
    }

    if data, ok := response.UserInfo["sender"].(string); ok {
        fmt.Printf("Original sender: %s\n", data)
    }

    // Emit an event to the frontend
    app.Event.Emit("notification", result.Response)
})
```

---

## Notification Customisation

### Custom Metadata

Both basic and interactive notifications can include custom data:

```go
notifier.SendNotification(notifications.NotificationOptions{
    ID:       "unique-id",
    Title:    "New Calendar Invite",
    Subtitle: "From: Jane Doe",
    Body:     "Tap to view the event",
    Data: map[string]interface{}{
        "sender":    "jane.doe@example.com",
        "timestamp": "2025-03-10T15:30:00Z",
    },
})
```

---

## Platform Considerations

### macOS

- Requires user authorization
- Requires the app to be notarized for distribution
- Uses system-standard notification appearances
- Supports `subtitle`
- Supports user text input
- Supports the `Destructive` action option
- Automatically handles dark/light mode

### Windows

- Uses Windows system toast styles
- Adapts to Windows theme settings
- Supports user text input
- Supports high DPI displays
- Does not support `subtitle`

### Linux

- Uses native notifications when available
- Follows desktop environment theme
- Positions according to desktop environment rules
- Supports `subtitle`
- Does not support user text input

---

## Best Practices

1. **Check and request authorization** — macOS requires user authorization before notifications can be shown.
2. **Provide clear and concise notifications** — use descriptive titles, subtitles, body text, and action titles.
3. **Handle notification responses appropriately** — check for errors and provide feedback for user actions.
4. **Consider platform conventions** — follow platform-specific notification patterns and respect system settings.

---

## API Reference

### Service Management

| Method | Description |
|---|---|
| `New()` | Creates a new notifications service |

### Notification Authorization

| Method | Description |
|---|---|
| `RequestNotificationAuthorization()` | Requests permission to display notifications (macOS) |
| `CheckNotificationAuthorization()` | Checks current notification authorization status (macOS) |

### Sending Notifications

| Method | Description |
|---|---|
| `SendNotification(options NotificationOptions)` | Sends a basic notification |
| `SendNotificationWithActions(options NotificationOptions)` | Sends an interactive notification with actions |

### Notification Categories

| Method | Description |
|---|---|
| `RegisterNotificationCategory(category NotificationCategory)` | Registers a reusable notification category |
| `RemoveNotificationCategory(categoryID string)` | Removes a previously registered category |

### Managing Notifications

| Method | Description |
|---|---|
| `RemoveAllPendingNotifications()` | Removes all pending notifications (macOS and Linux only) |
| `RemovePendingNotification(identifier string)` | Removes a specific pending notification (macOS and Linux only) |
| `RemoveAllDeliveredNotifications()` | Removes all delivered notifications (macOS and Linux only) |
| `RemoveDeliveredNotification(identifier string)` | Removes a specific delivered notification (macOS and Linux only) |
| `RemoveNotification(identifier string)` | Removes a notification (Linux-specific) |

### Event Handling

| Method | Description |
|---|---|
| `OnNotificationResponse(callback func(result NotificationResult))` | Registers a callback for notification responses |

---

## Structs and Types

### NotificationOptions

```go
type NotificationOptions struct {
    ID         string                 // Unique identifier for the notification
    Title      string                 // Main notification title
    Subtitle   string                 // Subtitle text (macOS and Linux only)
    Body       string                 // Main notification content
    CategoryID string                 // Category identifier for interactive notifications
    Data       map[string]interface{} // Custom data to associate with the notification
}
```

### NotificationCategory

```go
type NotificationCategory struct {
    ID               string               // Unique identifier for the category
    Actions          []NotificationAction // Button actions for the notification
    HasReplyField    bool                 // Whether to include a text input field
    ReplyPlaceholder string               // Placeholder text for the input field
    ReplyButtonTitle string               // Text for the reply button
}
```

### NotificationAction

```go
type NotificationAction struct {
    ID          string // Unique identifier for the action
    Title       string // Button text
    Destructive bool   // Whether the action is destructive (macOS-specific)
}
```

### NotificationResponse

```go
type NotificationResponse struct {
    ID               string                 // Notification identifier
    ActionIdentifier string                 // Action that was triggered
    CategoryID       string                 // Category of the notification
    Title            string                 // Title of the notification
    Subtitle         string                 // Subtitle of the notification
    Body             string                 // Body text of the notification
    UserText         string                 // Text entered by the user
    UserInfo         map[string]interface{} // Custom data from the notification
}
```

### NotificationResult

```go
type NotificationResult struct {
    Response NotificationResponse // Response data
    Error    error                // Any error that occurred
}
```

---

**Resources:** [Notifications example](/examples/notifications) · [Discord](https://discord.gg/JDdSxwjhGf)
