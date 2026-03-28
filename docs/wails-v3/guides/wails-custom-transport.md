# Creating Custom Transport Layer

Learn how to create and customize your own Wails v3 custom IPC transport layer.

Wails v3 allows you to provide a custom IPC transport layer while retaining all generated bindings and event communication. This enables you to replace the default HTTP fetch-based transport with WebSockets, custom protocols, or any other transport mechanism.

## Overview

By default, Wails uses HTTP fetch requests from the frontend to communicate with the backend via `/wails/runtime`. The custom transport API allows you to:

- Replace the HTTP transport with WebSockets, gRPC, or any custom protocol
- Maintain full compatibility with Wails code generation
- Keep all existing bindings, events, dialogs, and other Wails features
- Implement your own connection management, authentication, and error handling

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (TypeScript)                          │
│  - Generated bindings still work                │
│  - Your custom client transport                 │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Your Protocol (WebSocket/etc)
                   │
┌──────────────────▼──────────────────────────────┐
│  Backend (Go)                                   │
│  - Your Transport implementation                │
│  - Wails MessageProcessor                       │
│  - All existing Wails infrastructure            │
└─────────────────────────────────────────────────┘
```

## Usage

### 1. Implement the Transport Interface

Create a custom transport by implementing the `Transport` interface:

```go
package main

import (
    "context"
    "github.com/wailsapp/wails/v3/pkg/application"
)

type MyCustomTransport struct {
    // Your fields
}

func (t *MyCustomTransport) Start(ctx context.Context, processor *application.MessageProcessor) error {
    // Initialize your transport (WebSocket server, gRPC server, etc.)
    // When you receive requests, call processor.HandleRuntimeCallWithIDs()
    return nil
}

func (t *MyCustomTransport) Stop() error {
    // Clean up your transport
    return nil
}
```

### 2. Configure Your Application

Pass your custom transport to the application options:

```go
func main() {
    app := application.New(application.Options{
        Name: "My App",
        Transport: &MyCustomTransport{},
        // ... other options
    })

    err := app.Run()
    if err != nil {
        log.Fatal(err)
    }
}
```

### 3. Modify Frontend Runtime

If using a custom transport, you'll need to modify the frontend runtime to use your transport instead of HTTP fetch. Implement `RuntimeTransport` interface:

```typescript
const { setTransport } = await import('/wails/runtime.js');

class MyRuntimeTransport {
  call(objectID: number, method: number, windowName: string, args: any): Promise<any> {
    // TODO: implement IPC call with your transport protocol
    return resp;
  }
}

const myTransport = new MyRuntimeTransport();
setTransport(myTransport);
```

## Notes

- The default HTTP transport continues to work if no custom transport is specified
- Generated bindings remain unchanged - only the transport layer changes
- Events, dialogs, clipboard, and all other Wails features work transparently
- You're responsible for error handling, reconnection logic, and security in your custom transport

## API Reference

### Transport Interface

```go
type Transport interface {
    Start(ctx context.Context, messageProcessor *application.MessageProcessor) error
    Stop() error
}
```

### AssetServerTransport Interface (Optional)

For browser-based deployments or when you want to serve both assets and IPC through your custom transport, implement the `AssetServerTransport` interface:

```go
type AssetServerTransport interface {
    Transport

    // ServeAssets configures the transport to serve assets alongside IPC.
    ServeAssets(assetHandler http.Handler) error
}
```

**When to implement this interface:**
- Running the app in a browser instead of a webview
- Serving assets over HTTP alongside your custom IPC transport
- Building network-accessible applications

**Example implementation:**

```go
func (t *MyTransport) ServeAssets(assetHandler http.Handler) error {
    mux := http.NewServeMux()
    // Your implementation
}
```
