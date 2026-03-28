# Frequently Asked Questions

Common questions about Wails.

## General

### What is Wails?

Wails is a framework for building desktop applications using Go and web technologies. It provides native OS integration whilst allowing you to build your UI with HTML, CSS, and JavaScript.

### How does Wails compare to Electron?

**Wails:**
- ~10MB memory usage
- ~15MB binary size
- Native performance
- Go backend

**Electron:**
- ~100MB+ memory usage
- ~150MB+ binary size
- Chromium overhead
- Node.js backend

### Is Wails production-ready?

Yes! Wails v3 is suitable for production applications. Many companies use Wails for their desktop applications.

### What platforms does Wails support?

- Windows (7+)
- macOS (10.13+)
- Linux (GTK3)

## Development

### Do I need to know Go?

Basic Go knowledge is helpful but not required. You can start with simple services and learn as you go.

### Can I use my favourite frontend framework?

Yes! Wails works with:
- Vanilla JavaScript
- React
- Vue
- Svelte
- Any framework that builds to HTML/CSS/JS

### How do I call Go functions from JavaScript?

Use bindings:

```go
// Go
func (s *Service) Greet(name string) string {
    return "Hello " + name
}
```

```javascript
// JavaScript
import { Greet } from './bindings/myapp/service'
const message = await Greet("World")
```

### Can I use TypeScript?

Yes! Wails generates TypeScript definitions automatically.

### How do I debug my application?

Use your browser's dev tools:
- Right-click → Inspect Element
- Or enable dev tools in window options

## Building & Distribution

### How do I build for production?

```bash
wails3 build
```

Your application will be in `build/bin/`.

### Can I cross-compile?

Yes! Build for other platforms:

```bash
wails3 build -platform windows/amd64
wails3 build -platform darwin/universal
wails3 build -platform linux/amd64
```

### How do I create an installer?

Use platform-specific tools:
- Windows: NSIS or WiX
- macOS: Create DMG
- Linux: DEB/RPM packages

See the [Installers Guide](/guides/installers).

### How do I code sign my application?

**macOS:**
```bash
codesign --deep --force --sign "Developer ID" MyApp.app
```

**Windows:**
Use SignTool with your certificate.

## Features

### Can I create multiple windows?

Yes! Wails v3 has native multi-window support:

```go
window1 := app.Window.New()
window2 := app.Window.New()
```

### Does Wails support system tray?

Yes! Create system tray applications:

```go
tray := app.SystemTray.New()
tray.SetIcon(iconBytes)
tray.SetMenu(menu)
```

### Can I use native dialogs?

Yes! Wails provides native dialogs:

```go
path, _ := app.Dialog.OpenFile().
    SetTitle("Select File").
    PromptForSingleSelection()
```

### Does Wails support auto-updates?

Yes! Wails provides an auto-updater service. See the [Updater API](/reference/updater).

### Can I access native APIs?

Yes! You can call any Go code, including native APIs:
- File system access
- Database connections
- Network requests
- System APIs

## Performance

### How is Wails so small?

Wails uses the OS-provided WebView instead of bundling Chromium. This saves ~100MB.

### Is it fast?

Yes! Go is compiled to native code, and the WebView provides native rendering performance.

## Security

### Is my code secure?

Your Go code is compiled to native binary. The frontend communicates via a secure bridge with type validation.

### Can the frontend access my Go code?

Only exported methods of registered services are accessible. Private methods and unregistered types are not exposed.

## Getting Help

### Where can I get help?

- [Discord](https://discord.gg/JDdSxwjhGf) - Community support
- [GitHub Issues](https://github.com/wailsapp/wails/issues) - Bug reports
- [Documentation](/reference/overview) - API reference

### How do I report a bug?

Create an issue on [GitHub](https://github.com/wailsapp/wails/issues) with:
- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Platform and Wails version
