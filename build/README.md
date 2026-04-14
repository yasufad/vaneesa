# Vaneesa Build Configuration

This directory contains platform-specific build configurations and assets for packaging Vaneesa.

## Quick Start

### Development Build

```bash
# Build for current platform
wails3 build

# Build with dev flags (faster compilation, includes debug symbols)
wails3 build DEV=true
```

### Production Package

```bash
# Package for current platform
wails3 package

# Package for specific platform
wails3 package GOOS=windows
wails3 package GOOS=darwin
wails3 package GOOS=linux
```

## Platform-Specific Packaging

### Windows

**Prerequisites:**
- NSIS installed (`winget install NSIS.NSIS`)
- Npcap installed (required for packet capture)

**Build NSIS Installer:**
```bash
wails3 package GOOS=windows
```

Output: `bin/vaneesa-amd64-installer.exe`

**Build MSIX Package (Microsoft Store):**
```bash
wails3 package GOOS=windows FORMAT=msix
```

**Code Signing:**
```bash
# Configure signing credentials
wails3 setup signing --platform windows

# Sign executable and installer
wails3 task windows:sign
wails3 task windows:sign:installer
```

**Important Notes:**
- Vaneesa requires administrator privileges for live packet capture
- The installer includes a WebView2 bootstrapper
- Users must run as administrator or the capture will fail with a clear error message
- PCAP replay and session review work without admin privileges

### macOS

**Prerequisites:**
- Xcode Command Line Tools
- Apple Developer ID certificate (for distribution)

**Build Application Bundle:**
```bash
wails3 package GOOS=darwin
```

**Build Universal Binary (Intel + Apple Silicon):**
```bash
wails3 task darwin:build:universal
wails3 task darwin:package
```

**Code Signing and Notarisation:**
```bash
# Configure signing credentials
wails3 setup signing --platform darwin

# Sign and notarise
wails3 task darwin:sign:notarize
```

### Linux

**Build Packages:**
```bash
wails3 package GOOS=linux
```

This creates:
- AppImage: `bin/vaneesa-amd64.AppImage`
- Debian package: `bin/vaneesa-amd64.deb`
- RPM package: `bin/vaneesa-amd64.rpm`

**Sign Packages:**
```bash
# Configure PGP key
wails3 setup signing --platform linux

# Sign packages
wails3 task linux:sign:packages
```

**Important Notes:**
- Requires `libpcap-dev` for building
- Requires `libpcap.so` at runtime
- Run with `sudo` or set `CAP_NET_RAW` capability:
  ```bash
  sudo setcap cap_net_raw,cap_net_admin=eip ./vaneesa
  ```

## Cross-Platform Builds

Cross-compilation requires Docker for CGO-enabled builds:

```bash
# Setup Docker image (one-time, ~800MB download)
wails3 task setup:docker

# Cross-compile
wails3 build GOOS=linux GOARCH=amd64
wails3 build GOOS=windows GOARCH=arm64
```

## Build Configuration Files

### `config.yml`
Main application metadata used across all platforms. Update version, company name, and product information here.

### `windows/info.json`
Windows-specific version information embedded in the executable.

### `windows/nsis/project.nsi`
NSIS installer script. Customise installer UI, shortcuts, and installation behaviour.

### `windows/wails.exe.manifest`
Windows application manifest. Defines DPI awareness and execution level.

### `darwin/Info.plist`
macOS application bundle metadata.

### `linux/*.desktop`
Linux desktop entry files for application launchers.

## Updating Build Assets

After modifying `config.yml`, regenerate platform-specific assets:

```bash
wails3 task common:update:build-assets
```

This updates:
- Windows `info.json`
- macOS `Info.plist`
- Linux `.desktop` files

## Icon Generation

To regenerate icons from `build/appicon.png`:

```bash
wails3 generate icons -input build/appicon.png
```

This creates:
- `windows/icon.ico` (Windows)
- `darwin/icon.icns` (macOS)
- `linux/icon.png` (Linux)

## Troubleshooting

### Windows: "makensis not found"
Install NSIS: `winget install NSIS.NSIS`

### Windows: SmartScreen Warning
Your executable isn't code-signed. See [Code Signing](#code-signing) above.

### macOS: "Developer cannot be verified"
The application isn't notarised. Users must right-click → Open on first launch, or you must notarise the build.

### Linux: "libpcap.so not found"
Install libpcap: `sudo apt install libpcap0.8` (Debian/Ubuntu) or `sudo dnf install libpcap` (Fedora/RHEL)

### Cross-compilation fails
Ensure Docker is running: `docker info`
Build the cross-compilation image: `wails3 task setup:docker`

## Advanced Tasks

List all available tasks:
```bash
wails3 task --list
```

Platform-specific tasks:
```bash
wails3 task windows:build
wails3 task darwin:build:universal
wails3 task linux:create:deb
```

Verbose output:
```bash
wails3 task build -v
```

Force rebuild:
```bash
wails3 task build -f
```
