# Code Signing

Guide for signing your Wails applications on all platforms.

Wails v3 provides built-in CLI tools for code signing, notarization, and PGP key management.

## Cross-Platform Signing Matrix

This matrix shows what you can sign from each source platform:

| Target Format | From Windows | From macOS | From Linux |
|---------------|:------------:|:----------:|:----------:|
| Windows EXE/MSI | Yes | Yes | Yes |
| macOS .app bundle | No | Yes | No |
| macOS notarization | No | Yes | No |
| Linux DEB | Yes | Yes | Yes |
| Linux RPM | Yes | Yes | Yes |

**Tip:** Windows and Linux packages can be signed from **any platform**. macOS signing requires a Mac due to Apple's tooling requirements.

### Signing Backends

Wails automatically selects the best available signing backend:

| Platform | Native Backend | Cross-Platform Backend |
|----------|----------------|------------------------|
| Windows | `signtool.exe` (Windows SDK) | Built-in |
| macOS | `codesign` (Xcode) | Not available |
| Linux | N/A | Built-in |

When running on the native platform, Wails uses the native tools for maximum compatibility.

## Quick Start

The easiest way to configure signing is using the interactive setup wizard:

```bash
wails3 setup signing
```

This command:
- Walks you through configuring signing credentials for each platform
- On macOS, lists available Developer ID certificates from your keychain
- For Linux, can generate a new PGP key if you don't have one
- **Stores passwords securely in your system keychain** (not in Taskfiles)
- Updates the `vars` section in each platform's Taskfile with non-sensitive config

**Tip:** Passwords are stored in your system's native credential store (macOS Keychain, Windows Credential Manager, or Linux Secret Service).

To configure only specific platforms:

```bash
wails3 setup signing --platform darwin
wails3 setup signing --platform windows --platform linux
```

### Manual Configuration

Alternatively, you can manually edit the platform-specific Taskfiles.

**macOS:** Edit `build/darwin/Taskfile.yml`:
```yaml
vars:
  SIGN_IDENTITY: "Developer ID Application: Your Company (TEAMID)"
  KEYCHAIN_PROFILE: "my-notarize-profile"
```

**Windows:** Edit `build/windows/Taskfile.yml`:
```yaml
vars:
  SIGN_CERTIFICATE: "path/to/certificate.pfx"
```

**Linux:** Edit `build/linux/Taskfile.yml`:
```yaml
vars:
  PGP_KEY: "path/to/signing-key.asc"
```

## macOS Code Signing

### Prerequisites

- Apple Developer Account ($99/year)
- Developer ID Application certificate

### Sign and Notarize

```bash
# Sign only
wails3 task darwin:sign

# Sign and notarize
wails3 task darwin:sign:notarize
```

### Configure Notarization

Store your Apple credentials:

```bash
wails3 signing credentials \
  --apple-id "you@email.com" \
  --team-id "TEAMID" \
  --password "app-specific-password" \
  --profile "my-notarize-profile"
```

## Windows Code Signing

### Prerequisites

- Code signing certificate from a CA (e.g., DigiCert, Sectigo)
- Certificate in PFX format

### Sign Executable

```bash
# Sign executable
wails3 task windows:sign

# Sign installer
wails3 task windows:sign:installer
```

### Configure Certificate

```yaml
vars:
  SIGN_CERTIFICATE: "path/to/certificate.pfx"
  TIMESTAMP_SERVER: "http://timestamp.digicert.com"
```

## Linux Package Signing

### Prerequisites

- PGP key for signing packages

### Sign Packages

```bash
# Sign DEB package
wails3 task linux:sign:deb

# Sign RPM package
wails3 task linux:sign:rpm

# Sign all packages
wails3 task linux:sign:packages
```

### Generate PGP Key

```bash
wails3 setup signing
```

Or manually:

```bash
gpg --gen-key
gpg --armor --export your@email.com > signing-key.asc
```
