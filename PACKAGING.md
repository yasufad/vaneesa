# Vaneesa Packaging Guide

Quick reference for building and distributing Vaneesa.

## Prerequisites

### Windows
- **NSIS**: `winget install NSIS.NSIS`
- **Npcap**: Required for end users (packet capture)
- **Code Signing Certificate** (optional, recommended for distribution)

### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **Apple Developer ID** (for distribution outside App Store)

### Linux
- **libpcap-dev**: `sudo apt install libpcap-dev` (Debian/Ubuntu)
- **PGP Key** (for package signing)

## Quick Commands

### Development
```bash
# Run with hot reload
wails3 dev

# Build for testing
wails3 build DEV=true
```

### Production Packaging
```bash
# Current platform
wails3 package

# Specific platform
wails3 package GOOS=windows
wails3 package GOOS=darwin
wails3 package GOOS=linux
```

### Code Signing
```bash
# Interactive setup (recommended)
wails3 setup signing

# Sign Windows executable
wails3 task windows:sign
wails3 task windows:sign:installer

# Sign and notarise macOS
wails3 task darwin:sign:notarize

# Sign Linux packages
wails3 task linux:sign:packages
```

## Output Locations

### Windows
- **Executable**: `bin/vaneesa.exe`
- **NSIS Installer**: `bin/vaneesa-amd64-installer.exe`
- **MSIX Package**: `bin/vaneesa-amd64.msix`

### macOS
- **Application Bundle**: `bin/vaneesa.app`
- **DMG Image**: `bin/vaneesa-amd64.dmg`
- **Universal Binary**: `bin/vaneesa-universal.app`

### Linux
- **AppImage**: `bin/vaneesa-amd64.AppImage`
- **Debian Package**: `bin/vaneesa-amd64.deb`
- **RPM Package**: `bin/vaneesa-amd64.rpm`

## Distribution Checklist

### Pre-Release
- [ ] Update version in `build/config.yml`
- [ ] Run `wails3 task common:update:build-assets`
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Test on target platforms
- [ ] Verify administrator privilege handling on Windows
- [ ] Test PCAP replay functionality
- [ ] Verify all anomaly detectors work correctly

### Windows Distribution
- [ ] Build installer: `wails3 package GOOS=windows`
- [ ] Sign executable: `wails3 task windows:sign`
- [ ] Sign installer: `wails3 task windows:sign:installer`
- [ ] Test installer on clean Windows machine
- [ ] Verify Npcap detection and error messaging
- [ ] Test with and without administrator privileges
- [ ] Upload to distribution platform

### macOS Distribution
- [ ] Build universal binary: `wails3 task darwin:build:universal`
- [ ] Sign application: `wails3 task darwin:sign`
- [ ] Notarise with Apple: `wails3 task darwin:sign:notarize`
- [ ] Create DMG: `wails3 task darwin:package`
- [ ] Test on Intel and Apple Silicon Macs
- [ ] Verify Gatekeeper acceptance
- [ ] Upload to distribution platform

### Linux Distribution
- [ ] Build all package formats: `wails3 package GOOS=linux`
- [ ] Sign packages: `wails3 task linux:sign:packages`
- [ ] Test on Debian/Ubuntu (deb)
- [ ] Test on Fedora/RHEL (rpm)
- [ ] Test AppImage on various distributions
- [ ] Verify libpcap dependency handling
- [ ] Upload to distribution platform

## Platform-Specific Notes

### Windows
- **Administrator Privileges**: Vaneesa requires admin rights for live packet capture. The installer warns users about this requirement.
- **Npcap Dependency**: Users must install Npcap separately. The application provides clear error messages if Npcap is missing.
- **SmartScreen**: Unsigned executables trigger SmartScreen warnings. Code signing is strongly recommended for public distribution.
- **WebView2**: The installer includes a bootstrapper that downloads WebView2 if needed.

### macOS
- **Notarisation**: Required for distribution outside the App Store. Users will see "Developer cannot be verified" without it.
- **Universal Binaries**: Build universal binaries for both Intel and Apple Silicon support.
- **Gatekeeper**: First launch requires right-click → Open if not notarised.
- **libpcap**: Included by default on macOS, no additional dependencies.

### Linux
- **Capabilities**: Instead of running as root, set capabilities:
  ```bash
  sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/vaneesa
  ```
- **libpcap**: Runtime dependency. Most distributions include it, but users may need to install `libpcap0.8` or `libpcap`.
- **Desktop Integration**: The `.desktop` files are automatically installed with deb/rpm packages.
- **AppImage**: Self-contained, no installation required. Users must make it executable: `chmod +x vaneesa-amd64.AppImage`

## Versioning

Vaneesa follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes or major architectural changes
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, backwards-compatible

Update version in `build/config.yml`, then regenerate assets:
```bash
wails3 task common:update:build-assets
```

## Release Process

1. **Create Release Branch**
   ```bash
   git checkout -b release/v0.2.0
   ```

2. **Update Version**
   - Edit `build/config.yml`
   - Run `wails3 task common:update:build-assets`
   - Update `CHANGELOG.md`

3. **Commit Changes**
   ```bash
   git add build/config.yml build/windows/info.json CHANGELOG.md
   git commit -m "chore(release): prepare v0.2.0"
   ```

4. **Build and Test**
   ```bash
   wails3 package GOOS=windows
   wails3 package GOOS=darwin
   wails3 package GOOS=linux
   ```

5. **Sign Packages**
   ```bash
   wails3 task windows:sign:installer
   wails3 task darwin:sign:notarize
   wails3 task linux:sign:packages
   ```

6. **Create Git Tag**
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

7. **Upload to Distribution Platforms**
   - GitHub Releases
   - Website download page
   - Package repositories (optional)

## Troubleshooting

### Build fails with "makensis not found"
Install NSIS: `winget install NSIS.NSIS` (Windows)

### "Developer cannot be verified" on macOS
The application isn't notarised. Run `wails3 task darwin:sign:notarize` or instruct users to right-click → Open.

### SmartScreen warning on Windows
The executable isn't code-signed. Obtain a code signing certificate and run `wails3 task windows:sign:installer`.

### Cross-compilation fails
Ensure Docker is running and the cross-compilation image is built:
```bash
docker info
wails3 task setup:docker
```

### "libpcap.so not found" on Linux
Install libpcap runtime library:
```bash
sudo apt install libpcap0.8  # Debian/Ubuntu
sudo dnf install libpcap     # Fedora/RHEL
```

## Further Documentation

- **Build System Details**: See `build/README.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Contributing**: See `CONTRIBUTING.md`
- **Wails v3 Documentation**: https://v3.wails.io/
