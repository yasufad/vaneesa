# QR Code Service Tutorial

Create a QR code service to learn about Wails services.

A **service** in Wails is a Go struct that contains business logic you want to make available to your frontend. Services keep your code organized by grouping related functionality together.

Think of a service as a collection of methods that your JavaScript code can call. Each public method on the service becomes callable from the frontend after generating bindings.

In this tutorial, we'll create a QR code generator service to demonstrate these concepts.

## Step 1: Create the QR Service file

Create a new file called `qrservice.go` in your application directory:

```go
package main

import (
    "github.com/skip2/go-qrcode"
)

// QRService handles QR code generation
type QRService struct{}

// NewQRService creates a new QR service
func NewQRService() *QRService {
    return &QRService{}
}

// Generate creates a QR code from the given text
func (s *QRService) Generate(text string, size int) ([]byte, error) {
    qr, err := qrcode.New(text, qrcode.Medium)
    if err != nil {
        return nil, err
    }

    png, err := qr.PNG(size)
    if err != nil {
        return nil, err
    }

    return png, nil
}
```

## Step 2: Register the Service

Registration happens in `main.go`:

```go
func main() {
    app := application.New(application.Options{
        Name:        "myproject",
        Services: []application.Service{
            application.NewService(NewQRService()),
        },
    })

    app.Window.New()
    app.Run()
}
```

## Step 3: Install Dependencies

```bash
go mod tidy
```

## Step 4: Generate the Bindings

```bash
wails3 generate bindings
```

## Step 5: Use Bindings in Frontend

```javascript
import { QRService } from './bindings/changeme';

async function generateQR() {
    const text = document.getElementById('text').value;
    const qrCodeBase64 = await QRService.Generate(text, 256);
    document.getElementById('qrcode').src = `data:image/png;base64,${qrCodeBase64}`;
}
```

## Alternative: HTTP Handler

For serving files directly, implement `ServeHTTP`:

```go
func (s *QRService) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    text := r.URL.Query().Get("text")
    size, _ := strconv.Atoi(r.URL.Query().Get("size"))
    
    qrCodeData, err := s.Generate(text, size)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "image/png")
    w.Write(qrCodeData)
}
```

Register with a route:

```go
application.NewService(NewQRService(), application.ServiceOptions{
    Route: "/qrservice",
})
```

Use in frontend:

```javascript
img.src = `/qrservice?text=${encodeURIComponent(text)}`
```
