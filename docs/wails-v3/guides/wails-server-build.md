# Server Build

Run Wails applications as HTTP servers without a native GUI window.

**Experimental Feature:** Server mode is experimental and may change in future releases.

Wails v3 supports server mode, allowing you to run your application as a pure HTTP server without creating native windows or requiring GUI dependencies. This enables deploying the same Wails application to servers, containers, and web browsers.

## Overview

Server mode is useful for:

- **Docker/Container deployments** - Run without X11/Wayland dependencies
- **Server-side applications** - Deploy as a web server accessible via browser
- **Web-only access** - Share the same codebase between desktop and web
- **CI/CD testing** - Run integration tests without a display server
- **Microservices** - Use Wails bindings in headless backend services

## Quick Start

Server mode is enabled via the `server` build tag. Your application code remains the same - you just build with the tag:

```bash
# Using Taskfile (recommended)
wails3 task build:server
wails3 task run:server

# Or build directly with Go
go build -tags server -o myapp-server .
```

Here's a minimal example:

```go
package main

import (
    "embed"
    "log"

    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed frontend/dist
var assets embed.FS

func main() {
    app := application.New(application.Options{
        Name: "My App",
        Server: application.ServerOptions{
            Host: "localhost",
            Port: 8080,
        },
        Services: []application.Service{
            application.NewService(&MyService{}),
        },
        Assets: application.AssetOptions{
            Handler: application.AssetFileServerFS(assets),
        },
    })

    log.Println("Starting application...")
    if err := app.Run(); err != nil {
        log.Fatal(err)
    }
}
```

The same code can be built for desktop (without the tag) or server mode (with `-tags server`).

## Configuration

### ServerOptions

Configure the HTTP server with `ServerOptions`:

```go
Server: application.ServerOptions{
    // Host to bind to. Default: "localhost"
    // Use "0.0.0.0" to listen on all interfaces
    Host: "localhost",

    // Port to listen on. Default: 8080
    Port: 8080,

    // Request read timeout. Default: 30s
    ReadTimeout: 30 * time.Second,

    // Response write timeout. Default: 30s
    WriteTimeout: 30 * time.Second,

    // Idle connection timeout. Default: 120s
    IdleTimeout: 120 * time.Second,

    // Graceful shutdown timeout. Default: 30s
    ShutdownTimeout: 30 * time.Second,

    // TLS configuration (optional)
    TLS: &application.TLSOptions{
        CertFile: "/path/to/cert.pem",
        KeyFile:  "/path/to/key.pem",
    },
},
```

## Features

### Health Check Endpoint

A health check endpoint is automatically available at `/health`:

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

This is useful for:
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring systems

### Service Bindings

All service bindings work identically to desktop mode:

```go
type GreetService struct{}

func (g *GreetService) Greet(name string) string {
    return "Hello, " + name + "!"
}

// Register in options
Services: []application.Service{
    application.NewService(&GreetService{}),
},
```

The frontend can call these bindings using the standard Wails runtime.
