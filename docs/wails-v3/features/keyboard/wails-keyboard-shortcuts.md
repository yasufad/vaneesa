# Keyboard Shortcuts

Register global keyboard shortcuts for quick access to functionality.

Wails provides a powerful key binding system that allows you to register global keyboard shortcuts that work across all windows in your application. This enables users to quickly access functionality without navigating through menus.

---

## Accessing the Key Binding Manager

```go
app := application.New(application.Options{
    Name: "Keyboard Shortcuts Demo",
})

keyBindings := app.KeyBinding
```

---

## Adding Key Bindings

### Basic Key Binding

```go
app.KeyBinding.Add("Ctrl+S", func(window application.Window) {
    app.Logger.Info("Save shortcut triggered")
    // Perform save operation...
})
```

### Multiple Key Bindings

```go
// File operations
app.KeyBinding.Add("Ctrl+N", func(window application.Window) {
    window.EmitEvent("file:new", nil)
})

app.KeyBinding.Add("Ctrl+O", func(window application.Window) {
    dialog := app.Dialog.OpenFile()
    if file, err := dialog.PromptForSingleSelection(); err == nil {
        window.EmitEvent("file:open", file)
    }
})

app.KeyBinding.Add("Ctrl+S", func(window application.Window) {
    window.EmitEvent("file:save", nil)
})

// Edit operations
app.KeyBinding.Add("Ctrl+Z", func(window application.Window) {
    window.EmitEvent("edit:undo", nil)
})

app.KeyBinding.Add("Ctrl+Y", func(window application.Window) {
    window.EmitEvent("edit:redo", nil) // Windows/Linux
})

app.KeyBinding.Add("Cmd+Shift+Z", func(window application.Window) {
    window.EmitEvent("edit:redo", nil) // macOS
})
```

---

## Accelerator Format

Key bindings use a standard accelerator format combining modifier keys and a key name:

```go
// Modifier combinations
"Ctrl+S"        // Control + S
"Cmd+S"         // Command + S (macOS)
"Alt+F4"        // Alt + F4
"Shift+Ctrl+Z"  // Shift + Control + Z

// Function keys
"F1"            // F1 key
"Ctrl+F5"       // Control + F5

// Special keys
"Escape"
"Enter"
"Space"
"Tab"
"Backspace"
"Delete"

// Arrow keys
"Up"
"Down"
"Left"
"Right"
```

### Platform-Specific Accelerators

```go
import "runtime"

// Register the correct shortcut per platform
if runtime.GOOS == "darwin" {
    app.KeyBinding.Add("Cmd+S", saveHandler)
} else {
    app.KeyBinding.Add("Ctrl+S", saveHandler)
}

// Or simply register both — only the matching one fires on each platform
app.KeyBinding.Add("Ctrl+S", saveHandler)
app.KeyBinding.Add("Cmd+S", saveHandler)
```

---

## Managing Key Bindings

### Removing Key Bindings

```go
app.KeyBinding.Remove("Ctrl+S")

// Example: temporary binding for a modal
app.KeyBinding.Add("Escape", func(window application.Window) {
    window.EmitEvent("modal:close", nil)
    app.KeyBinding.Remove("Escape") // remove after use
})
```

### Getting All Key Bindings

```go
allBindings := app.KeyBinding.GetAll()
for _, binding := range allBindings {
    app.Logger.Info("Key binding", "accelerator", binding.Accelerator)
}
```

---

## Advanced Usage

### Context-Aware Key Bindings

```go
app.KeyBinding.Add("Ctrl+S", func(window application.Window) {
    if isEditMode() {
        saveDocument()
    } else if isInSettings() {
        saveSettings()
    } else {
        app.Logger.Info("Save not available in current context")
    }
})
```

### Window-Specific Actions

The callback receives the currently active window, enabling window-specific behaviour:

```go
app.KeyBinding.Add("F11", func(window application.Window) {
    window.SetFullscreen(!window.Fullscreen())
})

app.KeyBinding.Add("Ctrl+W", func(window application.Window) {
    window.Close()
})
```

### Dynamic Key Binding Management

Add and remove bindings as the application state changes:

```go
func enableEditMode() {
    app.KeyBinding.Add("Ctrl+B", func(window application.Window) {
        window.EmitEvent("format:bold", nil)
    })
    app.KeyBinding.Add("Ctrl+I", func(window application.Window) {
        window.EmitEvent("format:italic", nil)
    })
    app.KeyBinding.Add("Ctrl+U", func(window application.Window) {
        window.EmitEvent("format:underline", nil)
    })
}

func disableEditMode() {
    app.KeyBinding.Remove("Ctrl+B")
    app.KeyBinding.Remove("Ctrl+I")
    app.KeyBinding.Remove("Ctrl+U")
}
```

---

## Platform Considerations

### macOS

Use `Cmd` instead of `Ctrl` for standard shortcuts. Note that `Cmd+Q`, `Cmd+H`, and `Cmd+M` are reserved by the system for quit, hide, and minimise respectively.

```go
app.KeyBinding.Add("Cmd+N", newFileHandler)
app.KeyBinding.Add("Cmd+O", openFileHandler)
app.KeyBinding.Add("Cmd+S", saveFileHandler)
app.KeyBinding.Add("Cmd+Z", undoHandler)
app.KeyBinding.Add("Cmd+Shift+Z", redoHandler)
app.KeyBinding.Add("Cmd+C", copyHandler)
app.KeyBinding.Add("Cmd+V", pasteHandler)
```

### Windows

Use `Ctrl` for standard shortcuts. `Alt+F4` closes the application and `F1` conventionally opens help.

```go
app.KeyBinding.Add("Ctrl+N", newFileHandler)
app.KeyBinding.Add("Ctrl+O", openFileHandler)
app.KeyBinding.Add("Ctrl+S", saveFileHandler)
app.KeyBinding.Add("Ctrl+Z", undoHandler)
app.KeyBinding.Add("Ctrl+Y", redoHandler)
app.KeyBinding.Add("Ctrl+C", copyHandler)
app.KeyBinding.Add("Ctrl+V", pasteHandler)
app.KeyBinding.Add("F1", helpHandler)
```

### Linux

Generally follows Windows conventions with `Ctrl`, though behaviour can vary by desktop environment. Some environments (GNOME, KDE) reserve certain shortcuts.

```go
app.KeyBinding.Add("Ctrl+N", newFileHandler)
app.KeyBinding.Add("Ctrl+O", openFileHandler)
app.KeyBinding.Add("Ctrl+S", saveFileHandler)
app.KeyBinding.Add("Ctrl+Z", undoHandler)
app.KeyBinding.Add("Ctrl+Shift+Z", redoHandler)
app.KeyBinding.Add("Ctrl+C", copyHandler)
app.KeyBinding.Add("Ctrl+V", pasteHandler)
```

---

## Best Practices

1. **Use standard shortcuts** — follow platform conventions for common operations. Use `runtime.GOOS` to register the right variant per platform.

2. **Provide visual feedback** — let users know when a shortcut fires:
    ```go
    app.KeyBinding.Add("Ctrl+S", func(window application.Window) {
        saveDocument()
        window.EmitEvent("notification:show", "Document saved")
    })
    ```

3. **Avoid system conflicts** — don't override reserved system shortcuts such as `Ctrl+Alt+Del` (Windows), `Cmd+Space` (macOS Spotlight), or `Alt+Tab` (window switching).

4. **Document shortcuts** — expose a help view listing available shortcuts:
    ```go
    app.KeyBinding.Add("F1", func(window application.Window) {
        showKeyboardShortcutsHelp()
    })
    ```

5. **Clean up temporary bindings** — remove bindings that are only valid in a specific mode:
    ```go
    func enterEditMode() {
        app.KeyBinding.Add("Escape", exitEditModeHandler)
    }

    func exitEditModeHandler(window application.Window) {
        exitEditMode()
        app.KeyBinding.Remove("Escape")
    }
    ```

---

## Complete Example

```go
package main

import (
    "runtime"
    "github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
    app := application.New(application.Options{
        Name: "Text Editor with Shortcuts",
    })

    // File operations — platform-aware
    if runtime.GOOS == "darwin" {
        app.KeyBinding.Add("Cmd+N", func(window application.Window) {
            window.EmitEvent("file:new", nil)
        })
        app.KeyBinding.Add("Cmd+O", func(window application.Window) {
            openFile(app, window)
        })
        app.KeyBinding.Add("Cmd+S", func(window application.Window) {
            window.EmitEvent("file:save", nil)
        })
    } else {
        app.KeyBinding.Add("Ctrl+N", func(window application.Window) {
            window.EmitEvent("file:new", nil)
        })
        app.KeyBinding.Add("Ctrl+O", func(window application.Window) {
            openFile(app, window)
        })
        app.KeyBinding.Add("Ctrl+S", func(window application.Window) {
            window.EmitEvent("file:save", nil)
        })
    }

    // View operations
    app.KeyBinding.Add("F11", func(window application.Window) {
        window.SetFullscreen(!window.Fullscreen())
    })

    app.KeyBinding.Add("F1", func(window application.Window) {
        showKeyboardShortcuts(window)
    })

    window := app.Window.New()
    window.SetTitle("Text Editor")

    if err := app.Run(); err != nil {
        panic(err)
    }
}

func openFile(app *application.App, window application.Window) {
    dialog := app.Dialog.OpenFile()
    dialog.AddFilter("Text Files", "*.txt;*.md")

    if file, err := dialog.PromptForSingleSelection(); err == nil {
        window.EmitEvent("file:open", file)
    }
}

func showKeyboardShortcuts(window application.Window) {
    shortcuts := `
Keyboard Shortcuts:
- Ctrl/Cmd+N: New file
- Ctrl/Cmd+O: Open file
- Ctrl/Cmd+S: Save file
- F11: Toggle fullscreen
- F1: Show this help
`
    window.EmitEvent("help:show", shortcuts)
}
```

> **Warning:** Be careful not to override critical system shortcuts. Some key combinations are reserved by the operating system and cannot be captured by applications.

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf)
