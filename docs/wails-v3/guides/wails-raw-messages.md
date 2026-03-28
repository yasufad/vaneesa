# Raw Messages

Implement custom frontend-to-backend communication for performance-critical applications.

Raw messages provide a low-level communication channel between your frontend and backend, bypassing the standard binding system. This trades convenience for speed.

## When to Use Raw Messages

Raw messages are best suited for extreme edge cases:

- **Ultra-high-frequency updates** - Thousands of messages per second where every microsecond matters
- **Custom message protocols** - When you need complete control over the wire format

**Tip:** For almost all use cases, standard [service bindings](/features/bindings/services) are recommended as they provide type safety, automatic serialization, and a better developer experience with negligible overhead.

## Backend Setup

Configure the `RawMessageHandler` in your application options:

```go
package main

import (
    "encoding/json"
    "fmt"

    "github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
    app := application.New(application.Options{
        Name: "Raw Message Demo",
        Assets: application.AssetOptions{
            Handler: application.BundledAssetFileServer(assets),
        },
        RawMessageHandler: func(window application.Window, message string, originInfo *application.OriginInfo) {
            fmt.Printf("Raw message from window '%s': %s (origin: %+v)\n", window.Name(), message, originInfo.Origin)

            // Process the message and respond via events
            response := processMessage(message)
            window.EmitEvent("raw-response", response)
        },
    })

    app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title: "My App",
        Name:  "main",
    })

    app.Run()
}

func processMessage(message string) map[string]any {
    // Your custom message processing logic
    return map[string]any{
        "received": message,
        "status":   "processed",
    }
}
```

### Handler Signature

```go
RawMessageHandler func(window Window, message string, originInfo *application.OriginInfo)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `window` | `Window` | The window that sent the message |
| `message` | `string` | The raw message content |
| `originInfo` | `*application.OriginInfo` | Origin information about the message source |

#### OriginInfo Structure

```go
type OriginInfo struct {
    Origin      string
    TopOrigin   string
    IsMainFrame bool
}
```

| Field | Type | Description |
|-------|------|-------------|
| `Origin` | `string` | The origin URL of the document that sent the message |
| `TopOrigin` | `string` | The top-level origin URL (may differ from Origin in iframes) |
| `IsMainFrame` | `bool` | Whether the message originated from the main frame |

#### Platform-Specific Availability

- **macOS:** `Origin` and `IsMainFrame` are provided
- **Windows:** `Origin` and `TopOrigin` are provided
- **Linux:** Only `Origin` is provided

### Origin Validation

**Caution:** Never assume a message is safe because it arrives in your handler. The origin information must be validated before processing sensitive operations or operations that modify state.

**Always verify the origin of incoming messages before processing them.** The `originInfo` parameter provides critical security information that must be validated to prevent unauthorized access.

### Key Validation Points

- **Always check `Origin`** - Verify the origin matches your expected trusted sources
- **Validate `IsMainFrame`** (macOS) - Be aware if the message comes from an iframe
- **Use `TopOrigin`** (Windows) - Verify the top-level origin when dealing with framed content
- **Reject unexpected origins** - Fail securely by rejecting messages from origins you don't explicitly allow

**Note:** Messages prefixed with `wails:` are reserved for internal Wails communication and will not be passed to your handler.

## Frontend Setup

Send raw messages using `System.invoke()`:

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import { System, Events } from '@wailsio/runtime'

        // Send raw message
        document.getElementById('send').addEventListener('click', () => {
            const message = document.getElementById('input').value
            System.invoke(message)
        })

        // Listen for response
        Events.On('raw-response', (event) => {
            console.log('Response:', event.data)
        })
    </script>
</head>
<body>
    <input type="text" id="input" placeholder="Enter message" />
    <button id="send">Send</button>
</body>
</html>
```
