# Frameless Windows

Create custom window chrome with frameless windows.

Wails provides **frameless window support** with CSS-based drag regions and platform-native behaviour. Remove the platform-native title bar for complete control over window chrome, custom designs, and unique user experiences whilst maintaining essential functionality like dragging, resizing, and system controls.

---

## Quick Start

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:     "Frameless App",
    Width:     800,
    Height:    600,
    Frameless: true,
})
```

**CSS for draggable title bar:**

```css
.titlebar {
    --wails-draggable: drag;
    height: 40px;
    background: #333;
}

.titlebar button {
    --wails-draggable: no-drag;
}
```

**HTML:**

```html
<div class="titlebar">
    <span>My Application</span>
    <button onclick="window.close()">×</button>
</div>
```

---

## Creating Frameless Windows

### Basic Frameless Window

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless: true,
    Width:     800,
    Height:    600,
})
```

What you get: no title bar, no window borders, no system buttons. What you need to implement: draggable area, close/minimise/maximise buttons, resize handles (if resizable).

### With Transparent Background

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless:      true,
    BackgroundType: application.BackgroundTypeTransparent,
})
```

Use for rounded corners, custom shapes, overlay windows, and splash screens.

---

## Drag Regions

Use the `--wails-draggable` CSS property:

```css
/* Draggable area */
.titlebar {
    --wails-draggable: drag;
}

/* Non-draggable elements within draggable area */
.titlebar button {
    --wails-draggable: no-drag;
}
```

Values: `drag` (area is draggable), `no-drag` (not draggable, even if parent is).

### Complete Title Bar Example

```html
<div class="titlebar">
    <div class="title">My Application</div>
    <div class="controls">
        <button class="minimize">−</button>
        <button class="maximize">□</button>
        <button class="close">×</button>
    </div>
</div>
```

```css
.titlebar {
    --wails-draggable: drag;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 40px;
    background: #2c2c2c;
    color: white;
    padding: 0 16px;
}

.title {
    font-size: 14px;
    user-select: none;
}

.controls {
    display: flex;
    gap: 8px;
}

.controls button {
    --wails-draggable: no-drag;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: white;
    font-size: 16px;
    cursor: pointer;
    border-radius: 4px;
}

.controls button:hover      { background: rgba(255, 255, 255, 0.1); }
.controls .close:hover      { background: #e81123; }
```

```javascript
import { Window } from '@wailsio/runtime'

document.querySelector('.minimize').addEventListener('click', () => Window.Minimise())
document.querySelector('.maximize').addEventListener('click', () => Window.Maximise())
document.querySelector('.close').addEventListener('click', () => Window.Close())
```

---

## System Buttons

### Using the Runtime (Recommended)

```javascript
import { Window } from '@wailsio/runtime'

document.querySelector('.minimize').addEventListener('click', () => Window.Minimise())
document.querySelector('.maximize').addEventListener('click', () => Window.Maximise())
document.querySelector('.close').addEventListener('click', () => Window.Close())
```

### Using Go Bindings

```go
type WindowControls struct {
    window *application.WebviewWindow
}

func (wc *WindowControls) Minimise() { wc.window.Minimise() }

func (wc *WindowControls) Maximise() {
    if wc.window.IsMaximised() {
        wc.window.UnMaximise()
    } else {
        wc.window.Maximise()
    }
}

func (wc *WindowControls) Close() { wc.window.Close() }
```

### Toggle Maximise State

```javascript
import { Window } from '@wailsio/runtime'

async function toggleMaximise() {
    const isMaximised = await Window.IsMaximised()

    if (isMaximised) {
        await Window.Restore()
    } else {
        await Window.Maximise()
    }

    updateMaximiseButton()
}

async function updateMaximiseButton() {
    const isMaximised = await Window.IsMaximised()
    const button = document.querySelector('.maximize')
    button.textContent = isMaximised ? '❐' : '□'
}
```

---

## Resize Handles

Use the `--wails-resize` CSS property:

```css
/* All edges */
body { --wails-resize: all; }

/* Specific edges */
.resize-top    { --wails-resize: top; }
.resize-bottom { --wails-resize: bottom; }
.resize-left   { --wails-resize: left; }
.resize-right  { --wails-resize: right; }

/* Corners */
.resize-top-left     { --wails-resize: top-left; }
.resize-top-right    { --wails-resize: top-right; }
.resize-bottom-left  { --wails-resize: bottom-left; }
.resize-bottom-right { --wails-resize: bottom-right; }
```

Example resize handle:

```html
<div class="resize-handle resize-bottom-right"></div>
```

```css
.resize-bottom-right {
    --wails-resize: bottom-right;
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: 0;
    right: 0;
    cursor: nwse-resize;
}
```

---

## Platform-Specific Behaviour

### Windows

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless: true,
    Windows: application.WindowsOptions{
        DisableFramelessWindowDecorations: false, // keep drop shadow & snap support
    },
})

// Trigger Windows 11 Snap Assist
window.SnapAssist()
```

Features: automatic drop shadow, Snap layouts (Windows 11), Aero Snap, DPI scaling. Disable `DisableFramelessWindowDecorations` to remove those decorations for full custom chrome.

### macOS

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless: true,
    Mac: application.MacOptions{
        TitleBarAppearsTransparent: true,
        InvisibleTitleBarHeight:    40,
    },
})
```

Features: native fullscreen support, traffic light buttons (optional), vibrancy effects, transparent title bar.

Hide traffic lights:

```go
Mac: application.MacOptions{
    TitleBarStyle: application.MacTitleBarStyleHidden,
},
```

`InvisibleTitleBarHeight` allows dragging whilst hiding the title bar. Only takes effect when the window is frameless or uses `AppearsTransparent`.

### Linux

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless: true,
})
```

Basic frameless support with CSS drag regions. Transparency requires a compositor. Tiling WMs have limited support.

---

## Common Patterns

### Pattern 1: Modern Title Bar

```html
<div class="modern-titlebar">
    <div class="app-icon"><img src="/icon.png" alt="App Icon"></div>
    <div class="title">My Application</div>
    <div class="controls">
        <button class="minimize">−</button>
        <button class="maximize">□</button>
        <button class="close">×</button>
    </div>
</div>
```

```css
.modern-titlebar {
    --wails-draggable: drag;
    display: flex;
    align-items: center;
    height: 40px;
    background: linear-gradient(to bottom, #3a3a3a, #2c2c2c);
    border-bottom: 1px solid #1a1a1a;
    padding: 0 16px;
}

.app-icon    { --wails-draggable: no-drag; width: 24px; height: 24px; margin-right: 12px; }
.title       { flex: 1; font-size: 13px; color: #e0e0e0; user-select: none; }
.controls    { display: flex; gap: 1px; }

.controls button {
    --wails-draggable: no-drag;
    width: 46px;
    height: 32px;
    border: none;
    background: transparent;
    color: #e0e0e0;
    cursor: pointer;
    transition: background 0.2s;
}

.controls button:hover { background: rgba(255, 255, 255, 0.1); }
.controls .close:hover { background: #e81123; color: white; }
```

### Pattern 2: Splash Screen

```go
splash := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:          "Loading...",
    Width:          400,
    Height:         300,
    Frameless:      true,
    AlwaysOnTop:    true,
    BackgroundType: application.BackgroundTypeTransparent,
})
```

```css
body { background: transparent; }

.splash {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    padding: 40px;
    text-align: center;
}
```

### Pattern 3: Rounded Window

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless:      true,
    BackgroundType: application.BackgroundTypeTransparent,
})
```

```css
body { background: transparent; margin: 8px; }

.window {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    height: calc(100vh - 16px);
}
```

### Pattern 4: Overlay Window

```go
overlay := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless:      true,
    AlwaysOnTop:    true,
    BackgroundType: application.BackgroundTypeTransparent,
})
```

```css
body { background: transparent; }

.overlay {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 20px;
}
```

---

## Complete Example

**Go:**

```go
package main

import (
    _ "embed"
    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed frontend/dist
var assets embed.FS

func main() {
    app := application.New(application.Options{Name: "Frameless App"})

    window := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:     "Frameless Application",
        Width:     1000,
        Height:    700,
        MinWidth:  800,
        MinHeight: 600,
        Frameless: true,

        Assets: application.AssetOptions{
            Handler: application.AssetFileServerFS(assets),
        },

        Mac: application.MacOptions{
            TitleBarAppearsTransparent: true,
            InvisibleTitleBarHeight:    40,
        },

        Windows: application.WindowsOptions{
            DisableFramelessWindowDecorations: false,
        },
    })

    window.Center()
    window.Show()
    app.Run()
}
```

**HTML:**

```html
<!DOCTYPE html>
<html>
<body>
    <div class="window">
        <div class="titlebar">
            <div class="title">Frameless Application</div>
            <div class="controls">
                <button class="minimize">−</button>
                <button class="maximize">□</button>
                <button class="close">×</button>
            </div>
        </div>
        <div class="content">
            <h1>Hello from Frameless Window!</h1>
        </div>
    </div>
    <script src="/main.js" type="module"></script>
</body>
</html>
```

**CSS:**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

.window { height: 100vh; display: flex; flex-direction: column; }

.titlebar {
    --wails-draggable: drag;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 40px;
    background: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    padding: 0 16px;
}

.title { font-size: 13px; font-weight: 500; color: #333; user-select: none; }

.controls { display: flex; gap: 8px; }

.controls button {
    --wails-draggable: no-drag;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #666;
    font-size: 16px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.controls button:hover { background: #f0f0f0; color: #333; }
.controls .close:hover  { background: #e81123; color: white; }

.content { flex: 1; padding: 40px; overflow: auto; }
```

**JavaScript:**

```javascript
import { Window } from '@wailsio/runtime'

document.querySelector('.minimize').addEventListener('click', () => Window.Minimise())

const maximiseBtn = document.querySelector('.maximize')
maximiseBtn.addEventListener('click', async () => {
    const isMaximised = await Window.IsMaximised()
    if (isMaximised) {
        await Window.Restore()
    } else {
        await Window.Maximise()
    }
    updateMaximiseButton()
})

document.querySelector('.close').addEventListener('click', () => Window.Close())

async function updateMaximiseButton() {
    const isMaximised = await Window.IsMaximised()
    maximiseBtn.textContent = isMaximised ? '❐' : '□'
    maximiseBtn.title = isMaximised ? 'Restore' : 'Maximise'
}

updateMaximiseButton()
```

---

## Best Practices

### Do

- Provide a draggable area — users need to move the window
- Implement system buttons — close, minimise, maximise
- Set minimum size to prevent unusable layouts
- Test on all platforms — behaviour varies
- Use CSS for drag regions — flexible and maintainable
- Provide visual feedback — hover states on buttons

### Don't

- Don't forget resize handles if window is resizable
- Don't make the entire window draggable — prevents interaction
- Don't forget `no-drag` on buttons — they won't work
- Don't use tiny drag areas — hard to grab

---

## Troubleshooting

**Window won't drag:** add `--wails-draggable: drag` to the title bar element.

**Buttons don't work:** add `--wails-draggable: no-drag` to buttons inside the draggable area.

**Can't resize:** add `--wails-resize: all` to `body` or add specific resize handle elements.

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Frameless example](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/frameless)
