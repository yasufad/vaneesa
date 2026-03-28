# Auto-Updates

Implement automatic application updates with Wails v3.

Wails v3 provides a built-in updater system that supports automatic update checking, downloading, and installation. The updater includes support for binary delta updates (patches) for minimal download sizes.

## Features

- **Automatic Checking:** Configure periodic update checks in the background
- **Delta Updates:** Download only what changed with bsdiff patches
- **Cross-Platform:** Works on macOS, Windows, and Linux
- **Secure:** SHA256 checksums and optional signature verification

## Quick Start

Add the updater service to your application:

```go
package main

import (
    "github.com/wailsapp/wails/v3/pkg/application"
    "time"
)

func main() {
    // Create the updater service
    updater, err := application.CreateUpdaterService(
        "1.0.0", // Current version
        application.WithUpdateURL("https://updates.example.com/myapp/"),
        application.WithCheckInterval(24 * time.Hour),
    )
    if err != nil {
        panic(err)
    }

    app := application.New(application.Options{
        Name: "MyApp",
        Services: []application.Service{
            application.NewService(updater),
        },
    })

    app.Run()
}
```

Then use it from your frontend:

```typescript
import { updater } from './bindings/myapp';

async function checkForUpdates() {
  const update = await updater.CheckForUpdate();

  if (update) {
    console.log(`New version available: ${update.version}`);
    console.log(`Release notes: ${update.releaseNotes}`);

    // Download and install
    await updater.DownloadAndApply();
  }
}
```

## Configuration Options

The updater supports various configuration options:

```go
updater, err := application.CreateUpdaterService(
    "1.0.0",
    // Required: URL where update manifests are hosted
    application.WithUpdateURL("https://updates.example.com/myapp/"),

    // Optional: Check for updates automatically every 24 hours
    application.WithCheckInterval(24 * time.Hour),

    // Optional: Allow pre-release versions
    application.WithAllowPrerelease(true),

    // Optional: Update channel (stable, beta, canary)
    application.WithChannel("stable"),

    // Optional: Require signed updates
    application.WithRequireSignature(true),
    application.WithPublicKey("your-ed25519-public-key"),
)
```

## Update Manifest Format

Host an `update.json` file on your server:

```json
{
  "version": "1.2.0",
  "release_date": "2025-01-15T00:00:00Z",
  "release_notes": "## What's New\n\n- Feature A\n- Bug fix B",
  "platforms": {
    "macos-arm64": {
      "url": "https://updates.example.com/myapp/myapp-1.2.0-macos-arm64.tar.gz",
      "size": 12582912,
      "checksum": "sha256:abc123...",
      "patches": [
        {
          "from": "1.1.0",
          "url": "https://updates.example.com/myapp/patches/1.1.0-to-1.2.0-macos-arm64.patch",
          "size": 14336,
          "checksum": "sha256:def456..."
        }
      ]
    },
    "windows-amd64": {
      "url": "https://updates.example.com/myapp/myapp-1.2.0-windows-amd64.zip",
      "size": 14680064,
      "checksum": "sha256:ghi789..."
    },
    "linux-amd64": {
      "url": "https://updates.example.com/myapp/myapp-1.2.0-linux-amd64.tar.gz",
      "size": 11534336,
      "checksum": "sha256:jkl012..."
    }
  },
  "minimum_version": "1.0.0",
  "mandatory": false
}
```

## Security Considerations

### Checksum Verification

All downloads are verified against SHA256 checksums before installation.

### Signature Verification

Enable signature verification for production applications:

```go
application.WithRequireSignature(true),
application.WithPublicKey("your-ed25519-public-key"),
```

### HTTPS

Always use HTTPS for update URLs to prevent man-in-the-middle attacks.
