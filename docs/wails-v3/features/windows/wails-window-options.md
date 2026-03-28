# Window Options

Complete reference for `WebviewWindowOptions`.

Wails provides comprehensive window configuration with dozens of options for size, position, appearance, and behaviour. This is the **complete reference** for `WebviewWindowOptions` — every option, every platform, with examples and constraints.

---

## WebviewWindowOptions Structure

```go
type WebviewWindowOptions struct {
    // Identity
    Name  string
    Title string

    // Size and Position
    Width     int
    Height    int
    X         int
    Y         int
    MinWidth  int
    MinHeight int
    MaxWidth  int
    MaxHeight int

    // Initial State
    Hidden      bool
    Frameless   bool
    Resizable   bool
    AlwaysOnTop bool
    Fullscreen  bool
    Minimised   bool
    Maximised   bool
    WindowState WindowState

    // Appearance
    BackgroundColour RGBA
    BackgroundType   BackgroundType

    // Content
    URL  string
    HTML string

    // Assets
    Assets application.AssetOptions

    // Input
    EnableFileDrop bool

    // Security
    ContentProtectionEnabled bool

    // Menu
    UseApplicationMenu bool

    // Lifecycle
    OnClose   func() bool
    OnDestroy func()

    // Platform-Specific
    Mac     MacOptions
    Windows WindowsOptions
    Linux   LinuxOptions
}
```

---

## Core Options

### Name

**Type:** `string` | **Default:** Auto-generated UUID | **Platform:** All

```go
Name: "main-window"
```

Unique identifier for finding the window later. Use descriptive, kebab-case names like `"main"`, `"settings"`, `"file-browser"`.

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Name: "settings-window",
})

// Later...
settings := app.GetWindowByName("settings-window")
```

### Title

**Type:** `string` | **Default:** Application name | **Platform:** All

```go
Title: "My Application"
```

Text shown in title bar and taskbar. Can be updated at runtime:

```go
window.SetTitle("My Application - Document.txt")
```

### Width / Height

**Type:** `int` (pixels) | **Default:** 800 × 600 | **Platform:** All

```go
Width:  1200,
Height: 800,
```

Initial window size in logical pixels. Wails handles DPI scaling automatically — use logical pixels, not physical. Consider minimum screen resolution (1024×768).

| Use Case | Width | Height |
|---|---|---|
| Small utility | 400 | 300 |
| Standard app | 1024 | 768 |
| Large app | 1440 | 900 |
| Full HD | 1920 | 1080 |

### X / Y

**Type:** `int` (pixels) | **Default:** Centred on screen | **Platform:** All

```go
X: 100,  // 100px from left edge
Y: 100,  // 100px from top edge
```

(0, 0) is the top-left of the primary screen; positive X goes right, positive Y goes down.

Best practice — centre the window instead:

```go
window := app.Window.New()
window.Center()
```

### MinWidth / MinHeight

**Type:** `int` (pixels) | **Default:** 0 (no minimum) | **Platform:** All

```go
MinWidth:  400,
MinHeight: 300,
```

Prevents the window from being resized smaller than specified. Use to prevent broken layouts.

### MaxWidth / MaxHeight

**Type:** `int` (pixels) | **Default:** 0 (no maximum) | **Platform:** All

```go
MaxWidth:  1920,
MaxHeight: 1080,
```

Prevents the window from being resized larger than specified.

---

## State Options

### Hidden

**Type:** `bool` | **Default:** `false` | **Platform:** All

```go
Hidden: true,
```

Creates the window without showing it. Useful for background windows, windows shown on demand, or preventing a white flash while loading content.

On **Windows**, this also prevents the white window flash — the window stays invisible until `Show()` is called.

Recommended pattern for smooth loading:

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Name:             "main-window",
    Hidden:           true,
    BackgroundColour: application.RGBA{R: 30, G: 30, B: 30, A: 255},
})

// content loads...

window.Show() // no flash!
```

### Frameless

**Type:** `bool` | **Default:** `false` | **Platform:** All

```go
Frameless: true,
```

Removes the title bar and window borders. You'll need to implement window dragging, close/minimise/maximise buttons, and resize handles. See [Frameless Windows](windows-frameless.md) for details.

### Resizable

**Type:** `bool` | **Default:** `true` | **Platform:** All

```go
Resizable: false,
```

Controls whether the user can resize the window. Note: users can still maximise/fullscreen unless you prevent those too.

### AlwaysOnTop

**Type:** `bool` | **Default:** `false` | **Platform:** All

```go
AlwaysOnTop: true,
```

Keeps the window above all other windows. Use for floating toolbars, notifications, picture-in-picture, and timers. Linux support depends on the window manager.

### Fullscreen

**Type:** `bool` | **Default:** `false` | **Platform:** All

```go
Fullscreen: true,
```

Starts in fullscreen mode. On macOS, this creates a new Space. Toggle at runtime with `window.Fullscreen()` / `window.UnFullscreen()`.

### Minimised / Maximised

**Type:** `bool` | **Default:** `false` | **Platform:** All

```go
Minimised: true,  // Start minimised
Maximised: true,  // Start maximised
```

Sets the initial window state. Don't set both to `true` — behaviour is undefined.

### WindowState

**Type:** `WindowState` enum | **Default:** `WindowStateNormal` | **Platform:** All

```go
WindowState: application.WindowStateMaximised,
```

Preferred over individual `Minimised`/`Maximised` flags. Values: `WindowStateNormal`, `WindowStateMinimised`, `WindowStateMaximised`, `WindowStateFullscreen`, `WindowStateHidden`.

---

## Appearance Options

### BackgroundColour

**Type:** `RGBA` struct | **Default:** White (255, 255, 255, 255) | **Platform:** All

```go
BackgroundColour: application.RGBA{R: 30, G: 30, B: 30, A: 255}, // dark theme
```

The window background colour shown before content loads. Match your app's theme to prevent a colour flash on startup.

```go
window.SetBackgroundColour(30, 30, 30, 255) // runtime update
```

### BackgroundType

**Type:** `BackgroundType` enum | **Default:** `BackgroundTypeSolid` | **Platform:** macOS, Windows 11+ (partial)

```go
BackgroundType: application.BackgroundTypeTranslucent,
```

Values: `BackgroundTypeSolid`, `BackgroundTypeTransparent`, `BackgroundTypeTranslucent`. Linux only supports solid.

---

## Content Options

### URL

**Type:** `string` | **Default:** Empty | **Platform:** All

```go
URL: "http://localhost:5173",  // development
```

Loads an external URL instead of embedded assets.

### HTML

**Type:** `string` | **Default:** Empty | **Platform:** All

```go
HTML: "<h1>Hello World</h1>",
```

Loads an HTML string directly. Useful for simple windows, generated content, or testing.

### Assets

**Type:** `AssetOptions` | **Default:** Inherited from application | **Platform:** All

```go
Assets: application.AssetOptions{
    Handler: application.AssetFileServerFS(assets),
},
```

Serves embedded frontend assets.

### UseApplicationMenu

**Type:** `bool` | **Default:** `false` | **Platform:** Windows, Linux (no effect on macOS)

```go
UseApplicationMenu: true,
```

Uses the application menu (set via `app.Menu.Set()`) for this window. On macOS this has no effect since macOS always uses a global menu bar. On Windows and Linux, windows don't display a menu by default — this option opts the window into the application-level menu.

```go
menu := app.NewMenu()
menu.AddRole(application.FileMenu)
app.Menu.Set(menu)

app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:              "Main Window",
    UseApplicationMenu: true,
})
```

If both `UseApplicationMenu` and a window-specific menu are set, the window-specific menu takes priority.

---

## Input Options

### EnableFileDrop

**Type:** `bool` | **Default:** `false` | **Platform:** All

```go
EnableFileDrop: true,
```

Enables drag-and-drop of files from the OS into the window. When enabled, the `WindowFilesDropped` event fires with dropped file paths.

```go
window := app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:          "File Uploader",
    EnableFileDrop: true,
})

window.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
    files := event.Context().DroppedFiles()
    for _, file := range files {
        fmt.Println("Dropped:", file)
    }
})
```

Mark HTML elements as drop targets:

```html
<div id="upload" data-file-drop-target>Drop files here</div>
```

---

## Security Options

### ContentProtectionEnabled

**Type:** `bool` | **Default:** `false` | **Platform:** Windows 10+, macOS

```go
ContentProtectionEnabled: true,
```

Prevents screen capture of the window contents. Not supported on Linux. Does not prevent physical photography and is part of a comprehensive security strategy, not a sole protection.

```go
window.SetContentProtection(true) // toggle at runtime
```

---

## Lifecycle Options

### OnClose

**Type:** `func() bool` | **Default:** `nil` | **Platform:** All

```go
OnClose: func() bool {
    if hasUnsavedChanges() {
        result := showConfirmDialog("Unsaved changes. Close anyway?")
        return result == "yes"
    }
    return true
},
```

Return `false` to cancel the close. Only triggered by user actions (clicking X), not `window.Destroy()`.

### OnDestroy

**Type:** `func()` | **Default:** `nil` | **Platform:** All

```go
OnDestroy: func() {
    db.Close()
    removeWindow(window.ID())
},
```

Called when the window is destroyed. Use for releasing resources, closing connections, updating application state.

---

## Platform-Specific Options

### Mac Options

```go
Mac: application.MacWindow{
    TitleBar: application.MacTitleBar{
        AppearsTransparent: true,
        Hide:               false,
        HideTitle:          true,
        FullSizeContent:    true,
    },
    Backdrop:                application.MacBackdropTranslucent,
    InvisibleTitleBarHeight: 50,
    WindowLevel:             application.MacWindowLevelNormal,
    CollectionBehavior:      application.MacWindowCollectionBehaviorDefault,
},
```

**TitleBar** options: `AppearsTransparent` makes the title bar transparent and extends content into it; `Hide` hides the title bar completely; `HideTitle` hides only the title text; `FullSizeContent` extends content to the full window size.

**Backdrop**: `MacBackdropNormal` (default), `MacBackdropTranslucent` (blurred), `MacBackdropTransparent` (fully transparent).

**InvisibleTitleBarHeight**: Height of the invisible drag area. Only takes effect when the native title bar drag area is hidden — i.e. when `Frameless: true` or `AppearsTransparent: true`. Has no effect on standard windows.

**WindowLevel** values: `MacWindowLevelNormal`, `MacWindowLevelFloating`, `MacWindowLevelTornOffMenu`, `MacWindowLevelModalPanel`, `MacWindowLevelMainMenu`, `MacWindowLevelStatus`, `MacWindowLevelPopUpMenu`, `MacWindowLevelScreenSaver`.

**CollectionBehavior** — controls behaviour across macOS Spaces and fullscreen. These are bitmask values that can be combined with bitwise OR (`|`):

Space behaviour: `MacWindowCollectionBehaviorDefault`, `MacWindowCollectionBehaviorCanJoinAllSpaces`, `MacWindowCollectionBehaviorMoveToActiveSpace`, `MacWindowCollectionBehaviorManaged`, `MacWindowCollectionBehaviorTransient`, `MacWindowCollectionBehaviorStationary`.

Window cycling: `MacWindowCollectionBehaviorParticipatesInCycle`, `MacWindowCollectionBehaviorIgnoresCycle`.

Fullscreen behaviour: `MacWindowCollectionBehaviorFullScreenPrimary`, `MacWindowCollectionBehaviorFullScreenAuxiliary`, `MacWindowCollectionBehaviorFullScreenNone`, `MacWindowCollectionBehaviorFullScreenAllowsTiling`, `MacWindowCollectionBehaviorFullScreenDisallowsTiling`.

Example — Spotlight-like window visible on all Spaces and over fullscreen apps:

```go
Mac: application.MacWindow{
    CollectionBehavior: application.MacWindowCollectionBehaviorCanJoinAllSpaces |
                        application.MacWindowCollectionBehaviorFullScreenAuxiliary,
    WindowLevel:        application.MacWindowLevelFloating,
},
```

### Windows Options

```go
Windows: application.WindowsOptions{
    DisableWindowIcon:                 false,
    WindowBackdropType:                application.WindowsBackdropTypeAuto,
    CustomTheme:                       nil,
    DisableFramelessWindowDecorations: false,
},
```

**WindowBackdropType** values: `WindowsBackdropTypeAuto`, `WindowsBackdropTypeNone`, `WindowsBackdropTypeMica`, `WindowsBackdropTypeAcrylic`, `WindowsBackdropTypeTabbed` (Windows 11 only for Mica/Acrylic/Tabbed).

**DisableWindowIcon**: removes the icon from the title bar.

**DisableFramelessWindowDecorations**: disables default frameless window decorations for custom window chrome.

### Linux Options

```go
Linux: application.LinuxOptions{
    Icon:                []byte{/* PNG data */},
    WindowIsTranslucent: false,
},
```

**Icon**: window icon in PNG format, shown in the title bar and taskbar. **WindowIsTranslucent**: enables translucency (requires compositor support).

---

## Application-Level Windows Options

Some Windows-specific options must be set at the application level because WebView2 shares a single browser environment per user data path — these flags apply globally to **all windows**.

```go
app := application.New(application.Options{
    Name: "My App",
    Windows: application.WindowsOptions{
        EnabledFeatures: []string{
            "msWebView2EnableDraggableRegions",
        },
        DisabledFeatures: []string{
            "msExperimentalFeature",
        },
        AdditionalBrowserArgs: []string{
            "--disable-gpu",
            "--remote-debugging-port=9222",
        },
    },
})
```

**EnabledFeatures**: WebView2 feature flags to enable. **DisabledFeatures**: flags to disable (Wails automatically disables `msSmartScreenProtection`). **AdditionalBrowserArgs**: Chromium command-line arguments (must include `--` prefix).

---

## Complete Example

```go
package main

import (
    _ "embed"
    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed frontend/dist
var assets embed.FS

//go:embed icon.png
var icon []byte

func main() {
    app := application.New(application.Options{
        Name: "My Application",
    })

    window := app.Window.NewWithOptions(application.WebviewWindowOptions{
        Name:   "main-window",
        Title:  "My Application",

        Width:     1200,
        Height:    800,
        MinWidth:  800,
        MinHeight: 600,

        WindowState: application.WindowStateNormal,
        Resizable:   true,

        BackgroundColour: application.RGBA{R: 255, G: 255, B: 255, A: 255},

        Assets: application.AssetOptions{
            Handler: application.AssetFileServerFS(assets),
        },

        OnClose: func() bool {
            if hasUnsavedChanges() {
                result := showConfirmDialog("Unsaved changes. Close anyway?")
                return result == "yes"
            }
            return true
        },

        OnDestroy: func() {
            cleanup()
        },

        Mac: application.MacOptions{
            TitleBarAppearsTransparent: true,
            Backdrop:                   application.MacBackdropTranslucent,
        },

        Windows: application.WindowsOptions{
            WindowBackdropType: application.WindowsBackdropTypeMica,
            DisableWindowIcon:  false,
        },

        Linux: application.LinuxOptions{
            Icon: icon,
        },
    })

    window.Center()
    window.Show()

    app.Run()
}
```

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples)
