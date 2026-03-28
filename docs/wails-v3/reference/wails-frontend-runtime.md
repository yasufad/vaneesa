# Frontend Runtime

The Wails JavaScript runtime package for frontend integration.

The Wails frontend runtime is the standard library for Wails applications. It provides a number of features that may be used in your applications, including:

- Window management
- Dialogs
- Browser integration
- Clipboard
- Menus
- System information
- Events
- Context Menus
- Screens
- WML (Wails Markup Language)

The runtime is required for integration between Go and the frontend. There are 2 ways to integrate the runtime:

- Using the `@wailsio/runtime` package
- Using a pre-built bundle

## Using the npm package

The `@wailsio/runtime` package is a JavaScript package that provides access to the Wails runtime from the frontend. It is used by all standard templates and is the recommended way to integrate the runtime into your application.

The package is available on npm and can be installed using:

```shell
npm install --save @wailsio/runtime
```

## Using a pre-built bundle

Some projects will not use a Javascript bundler and may prefer to use a pre-built bundled version of the runtime. This version can be generated locally using the following command:

```shell
wails3 generate runtime
```

The command will output a `runtime.js` (and `runtime.debug.js`) file in the current directory. This file is an ES module that can be imported by your application scripts just like the npm package, but the API is also exported to the global window object.

**Caution:** It is important to include the `type="module"` attribute on the `<script>` tag that loads the runtime and to wait for the page to be fully loaded before calling the API, because scripts with the `type="module"` attribute run asynchronously.

## Initialisation

Apart from the API functions, the runtime provides support for context menus and window dragging. These features will only work as expected after the runtime has been initialised.

Even if you don't use the API, make sure to include a side-effect import statement somewhere in your frontend code:

```javascript
import "@wailsio/runtime";
```

Your bundler should detect the presence of side-effects and include all required initialisation code in the build.

**Note:** If you prefer the pre-built bundle, adding a script tag as shown above suffices.

## Vite Plugin for Typed Events

The runtime includes a Vite plugin that enables HMR (Hot Module Replacement) support for typed events during development.

### Setup

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import wails from '@wailsio/runtime/plugins/vite'

export default defineConfig({
  plugins: [wails()],
})
```

### Benefits

- **Automatic Reloading:** Event bindings are automatically regenerated and reloaded when you run `wails3 generate bindings`
- **Development Mode:** Works seamlessly with `wails3 dev` for instant updates
- **Type Safety:** Full TypeScript support with autocomplete and type checking

### Usage with Event Registration

Register your events in Go:

```go
type UserData struct {
    ID   string
    Name string
}

func init() {
    application.RegisterEvent[UserData]("user-updated")
}
```

Generate bindings:

```bash
wails3 generate bindings
```

Use typed events in your frontend:

```typescript
import { Events } from '@wailsio/runtime'
import { UserUpdated } from './bindings/events'

// Type-safe event with autocomplete
Events.Emit(UserUpdated({
    ID: "123",
    Name: "John Doe"
}))
```

## API Reference

The runtime is organized into modules, each providing specific functionality. Import only what you need:

```javascript
import { Events, Window, Clipboard } from '@wailsio/runtime'
```

### Events

Event system for communication between Go and JavaScript.

#### On()

Register a callback for an event.

```typescript
function On(eventName: string, callback: (event: WailsEvent) => void): () => void
```

**Returns:** Unsubscribe function

**Example:**
```javascript
import { Events } from '@wailsio/runtime'

// Basic event listening
const unsubscribe = Events.On('user-logged-in', (event) => {
    console.log('User:', event.data.username)
})

// Later: unsubscribe()
```

#### Once()

Register a callback that runs only once.

```typescript
function Once(eventName: string, callback: (event: WailsEvent) => void): () => void
```

**Example:**
```javascript
import { Events } from '@wailsio/runtime'

Events.Once('app-ready', () => {
    console.log('App initialized')
})
```

#### Emit()

Emit an event to Go backend or other windows.

```typescript
function Emit(name: string, data?: any): Promise<boolean>
```

**Returns:** Promise that resolves to `true` if the event was cancelled, `false` otherwise

**Example:**
```javascript
import { Events } from '@wailsio/runtime'

// Basic event emission
const wasCancelled = await Events.Emit('button-clicked', { buttonId: 'submit' })
```

**Note:** The return value indicates whether the event was cancelled by a hook. Most events cannot be cancelled and will always return `false`.

#### Off()

Remove event listeners.

```typescript
function Off(...eventNames: string[]): void
```

#### OffAll()

Remove all event listeners.

```typescript
function OffAll(): void
```

### Window

Window management methods. The default export is the current window.

```javascript
import { Window } from '@wailsio/runtime'

// Current window
await Window.SetTitle('New Title')
await Window.Center()

// Get another window
const otherWindow = Window.Get('secondary')
await otherWindow.Show()
```

#### Visibility

**Show()** - Shows the window

**Hide()** - Hides the window

**Close()** - Closes the window

#### Size and Position

**SetSize(width, height)** - Sets window size

**Size()** - Gets window size

**SetPosition(x, y)** - Sets absolute position

**Position()** - Gets absolute position

**Center()** - Centers the window

#### Window State

**Minimise()** - Minimizes the window

**Maximise()** - Maximizes the window

**Fullscreen()** - Enters fullscreen

**Restore()** - Restores from minimized/maximized/fullscreen

**IsMinimised()** - Checks if minimized

**IsMaximised()** - Checks if maximized

**IsFullscreen()** - Checks if fullscreen

#### Window Properties

**SetTitle(title)** - Sets window title

**Name()** - Gets window name

**SetBackgroundColour(r, g, b, a)** - Sets background color

**SetAlwaysOnTop(alwaysOnTop)** - Keeps window on top

**SetResizable(resizable)** - Makes window resizable

#### Focus and Screen

**Focus()** - Focuses the window

**IsFocused()** - Checks if focused

**GetScreen()** - Gets the screen the window is on

#### Content

**Reload()** - Reloads the page

**ForceReload()** - Forces page reload (clears cache)

#### Zoom

**SetZoom(level)** - Sets zoom level

**GetZoom()** - Gets zoom level

**ZoomIn()** - Increases zoom

**ZoomOut()** - Decreases zoom

**ZoomReset()** - Resets zoom to 100%

#### Printing

**Print()** - Opens the native print dialog

**Note:** This opens the native OS print dialog, allowing the user to select printer settings and print the current window content.

### Clipboard

Clipboard operations.

#### SetText()

Set clipboard text.

```typescript
function SetText(text: string): Promise<void>
```

#### Text()

Get clipboard text.

```typescript
function Text(): Promise<string>
```

### System

Low-level system methods for direct communication with the backend.

#### invoke()

Sends a raw message directly to the backend. This bypasses the standard binding system and is handled by the `RawMessageHandler` in your application options.

```typescript
function invoke(message: any): void
```

**Example:**
```javascript
import { System } from '@wailsio/runtime'

// Send a raw message to the backend
System.invoke('my-custom-message')
```

**Caution:** This is a fire-and-forget function with no return value. Use events to receive responses from the backend.

For more details, see the [Raw Messages Guide](/guides/raw-messages).

### Application

Application-level methods.

#### Show()

Shows all application windows.

#### Hide()

Hides all application windows.

#### Quit()

Quits the application.

### Browser

Open URLs in the default browser.

#### OpenURL()

Opens a URL in the system browser.

```typescript
function OpenURL(url: string | URL): Promise<void>
```

### Screens

Screen information and management.

#### GetAll()

Gets all screens.

#### GetPrimary()

Gets the primary screen.

#### GetCurrent()

Gets the current active screen.

**Screen Interface:**
```typescript
interface Screen {
    ID: string
    Name: string
    ScaleFactor: number
    X: number
    Y: number
    Size: { Width: number, Height: number }
    Bounds: { X: number, Y: number, Width: number, Height: number }
    WorkArea: { X: number, Y: number, Width: number, Height: number }
    IsPrimary: boolean
    Rotation: number
}
```

### Dialogs

Native OS dialogs from JavaScript.

#### Info()

Shows an information dialog.

#### Error()

Shows an error dialog.

#### Warning()

Shows a warning dialog.

#### Question()

Shows a question dialog with custom buttons.

#### OpenFile()

Shows a file open dialog.

#### SaveFile()

Shows a file save dialog.

### WML (Wails Markup Language)

WML provides declarative attributes for common actions. Add attributes to HTML elements:

#### Attributes

**wml-event** - Emits an event when clicked

```html
<button wml-event="save-clicked">Save</button>
```

**wml-window** - Calls a window method

```html
<button wml-window="Close">Close Window</button>
<button wml-window="Minimise">Minimize</button>
```

**wml-target-window** - Specifies target window for wml-window

```html
<button wml-window="Show" wml-target-window="settings">
    Show Settings
</button>
```

**wml-openurl** - Opens a URL in the browser

```html
<a href="#" wml-openurl="https://wails.io">Visit Wails</a>
```

**wml-confirm** - Shows confirmation dialog before action

```html
<button wml-window="Close" wml-confirm="Are you sure you want to close?">
    Close
</button>
```

## Complete Example

```javascript
import { Events, Window, Clipboard, Dialogs, Screens } from '@wailsio/runtime'

// Listen for events from Go
Events.On('data-updated', (event) => {
    console.log('Data:', event.data)
    updateUI(event.data)
})

// Window management
document.getElementById('center-btn').addEventListener('click', async () => {
    await Window.Center()
})

document.getElementById('fullscreen-btn').addEventListener('click', async () => {
    const isFullscreen = await Window.IsFullscreen()
    if (isFullscreen) {
        await Window.UnFullscreen()
    } else {
        await Window.Fullscreen()
    }
})

// Clipboard operations
document.getElementById('copy-btn').addEventListener('click', async () => {
    await Clipboard.SetText('Copied from Wails!')
})

// Dialog with confirmation
document.getElementById('delete-btn').addEventListener('click', async () => {
    const result = await Dialogs.Question({
        Title: 'Confirm',
        Message: 'Delete this item?',
        Buttons: [
            { Label: 'Delete' },
            { Label: 'Cancel', IsDefault: true }
        ]
    })

    if (result === 'Delete') {
        await Events.Emit('delete-item', { id: currentItemId })
    }
})

// Screen information
const screens = await Screens.GetAll()
console.log(`Detected ${screens.length} screen(s)`)
```

## Best Practices

### Do

- **Import selectively** - Only import what you need
- **Handle promises** - All methods return promises
- **Use WML for simple actions** - Cleaner than JavaScript
- **Check return values** - Especially for dialogs
- **Unsubscribe events** - Clean up when done

### Don't

- **Don't forget await** - Most methods are async
- **Don't block UI** - Use async/await properly
- **Don't ignore errors** - Always handle rejections

## TypeScript Support

The runtime includes full TypeScript definitions:

```typescript
import { Events, Window } from '@wailsio/runtime'

Events.On('custom-event', (event) => {
    // TypeScript knows event.data, event.name, event.sender
    console.log(event.data)
})

// All methods are fully typed
const size: { width: number, height: number } = await Window.Size()
```
