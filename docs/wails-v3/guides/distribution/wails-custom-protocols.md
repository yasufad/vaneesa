# Custom URL Protocols

Register custom URL schemes to launch your application from links.

Custom URL protocols (also called URL schemes) allow your application to be launched when users click links with your custom protocol, such as `myapp://action` or `myapp://open/document`.

## Overview

Custom protocols enable:
- **Deep linking:** Launch your app with specific data
- **Browser integration:** Handle links from web pages
- **Email links:** Open your app from email clients
- **Inter-app communication:** Launch from other applications

**Example:** `myapp://open/document?id=123` launches your app and opens document 123.

## Configuration

Define custom protocols in your application options:

```go
package main

import "github.com/wailsapp/wails/v3/pkg/application"

func main() {
    app := application.New(application.Options{
        Name:        "My Application",
        Description: "My awesome application",
        Protocols: []application.Protocol{
            {
                Scheme:      "myapp",
                Description: "My Application Protocol",
                Role:        "Editor",  // macOS only
            },
        },
    })

    // Register handler for protocol events
    app.Event.On(application.Events.ApplicationOpenedWithURL, func(event *application.ApplicationEvent) {
        url := event.Context().ClickedURL()
        handleCustomURL(url)
    })

    app.Run()
}

func handleCustomURL(url string) {
    // Parse and handle the custom URL
    println("Received URL:", url)
}
```

## Protocol Handler

Listen for protocol events to handle incoming URLs:

```go
app.Event.On(application.Events.ApplicationOpenedWithURL, func(event *application.ApplicationEvent) {
    url := event.Context().ClickedURL()

    // Parse the URL
    parsedURL, err := parseCustomURL(url)
    if err != nil {
        app.Logger.Error("Failed to parse URL:", err)
        return
    }

    // Handle different actions
    switch parsedURL.Action {
    case "open":
        openDocument(parsedURL.DocumentID)
    case "settings":
        showSettings()
    case "user":
        showUserProfile(parsedURL.UserID)
    default:
        app.Logger.Warn("Unknown action:", parsedURL.Action)
    }
})
```

## URL Structure

Design clear, hierarchical URL structures:

```
myapp://action/resource?param=value

Examples:
myapp://open/document?id=123
myapp://settings/theme?mode=dark
myapp://user/profile?username=john
```

**Best practices:**
- Use lowercase scheme names
- Keep schemes short and memorable
- Use hierarchical paths for resources
- Include query parameters for optional data
- URL-encode special characters

## Platform Registration

Custom protocols are registered differently on each platform.

### Windows

**Wails v3 automatically registers custom protocols** when using NSIS installers.

The NSIS installer:
1. Automatically registers all protocols defined in `application.Options.Protocols`
2. Associates protocols with your application executable
3. Sets up proper registry entries
4. Removes protocol associations during uninstall

### macOS

Protocols are registered via `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>My Application</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

### Linux

Protocols are registered via `.desktop` file:

```ini
[Desktop Entry]
Name=MyApp
Exec=myapp %u
MimeType=x-scheme-handler/myapp;
```
