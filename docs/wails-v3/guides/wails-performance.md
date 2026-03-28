# Performance Optimisation

Optimise your Wails application for speed, memory efficiency, and responsiveness.

## Overview

Optimise your Wails application for speed, memory efficiency, and responsiveness.

## Frontend Optimisation

### Bundle Size

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
}
```

### Code Splitting

```javascript
// Lazy load components
const Settings = lazy(() => import('./Settings'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
```

### Asset Optimisation

```javascript
// Optimise images
import { defineConfig } from 'vite'
import imagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    imagemin({
      gifsicle: { optimizationLevel: 3 },
      optipng: { optimizationLevel: 7 },
      svgo: { plugins: [{ removeViewBox: false }] },
    }),
  ],
})
```

## Backend Optimisation

### Efficient Bindings

```go
// Bad: Return everything
func (s *Service) GetAllData() []Data {
    return s.db.FindAll() // Could be huge
}

// Good: Paginate
func (s *Service) GetData(page, size int) (*PagedData, error) {
    return s.db.FindPaged(page, size)
}
```

### Caching

```go
type CachedService struct {
    cache *lru.Cache
    ttl   time.Duration
}

func (s *CachedService) GetData(key string) (interface{}, error) {
    // Check cache
    if val, ok := s.cache.Get(key); ok {
        return val, nil
    }

    // Fetch and cache
    data, err := s.fetchData(key)
    if err != nil {
        return nil, err
    }

    s.cache.Add(key, data)
    return data, nil
}
```

### Goroutines for Long Operations

```go
func (s *Service) ProcessLargeFile(path string) error {
    // Process in background
    go func() {
        result, err := s.process(path)
        if err != nil {
            s.app.Event.Emit("process-error", err.Error())
            return
        }
        s.app.Event.Emit("process-complete", result)
    }()

    return nil
}
```

## Memory Optimisation

### Avoid Memory Leaks

```go
// Bad: Goroutine leak
func (s *Service) StartPolling() {
    ticker := time.NewTicker(1 * time.Second)
    go func() {
        for range ticker.C {
            s.poll()
        }
    }()
    // ticker never stopped!
}

// Good: Proper cleanup
func (s *Service) StartPolling() {
    ticker := time.NewTicker(1 * time.Second)
    s.stopChan = make(chan bool)

    go func() {
        for {
            select {
            case <-ticker.C:
                s.poll()
            case <-s.stopChan:
                ticker.Stop()
                return
            }
        }
    }()
}
```

### Use Context for Cancellation

```go
func (s *Service) StartBackgroundTask(ctx context.Context) {
    go func() {
        ticker := time.NewTicker(1 * time.Second)
        defer ticker.Stop()

        for {
            select {
            case <-ticker.C:
                s.doWork()
            case <-ctx.Done():
                return
            }
        }
    }()
}
```

## Bridge Performance

### Batch Operations

```go
// Bad: N bridge calls
for _, item := range items {
    await ProcessItem(item)
}

// Good: 1 bridge call
await ProcessItems(items)
```

### Use Events for Streaming

```go
func (s *Service) ProcessData(data []string) {
    for i, item := range data {
        result := s.processItem(item)
        
        // Emit progress instead of returning
        s.app.Event.Emit("progress", map[string]interface{}{
            "current": i,
            "total":   len(data),
            "result":  result,
        })
    }
}
```

## Build Optimisation

### Strip Debug Symbols

```bash
# Already done by default in wails3 build
go build -ldflags="-s -w"
```

### Use UPX Compression

```bash
# After building
upx --best build/bin/myapp.exe
```

**Note:** Not recommended for macOS due to code signing issues.

## Best Practices

### Do

- Batch operations to reduce bridge calls
- Use events for streaming data
- Cache expensive computations
- Use goroutines for long operations
- Clean up resources properly
- Profile before optimising

### Don't

- Don't return huge datasets
- Don't block the UI thread
- Don't leak gor goroutines
- Don't optimise prematurely
- Don't ignore memory leaks
