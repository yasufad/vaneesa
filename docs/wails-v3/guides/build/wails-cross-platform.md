# Cross-Platform Building

Build for multiple platforms from a single machine.

## Quick Start

Wails v3 supports building for Windows, macOS, and Linux from any host operating system. The build system automatically detects your environment and chooses the right compilation method.

**Want to cross-compile to macOS and Linux?** Run this once to set up the Docker images (~800MB download):

```bash
wails3 task setup:docker
```

Then build for any platform:

```bash
# Build for current platform (production by default)
wails3 build

# Build for specific platforms
wails3 build GOOS=windows
wails3 build GOOS=darwin
wails3 build GOOS=linux

# Build for ARM64 architecture
wails3 build GOOS=windows GOARCH=arm64
wails3 build GOOS=darwin GOARCH=arm64
wails3 build GOOS=linux GOARCH=arm64

# Environment variable style also works
GOOS=darwin GOARCH=arm64 wails3 build
```

### Windows

Windows is the simplest cross-compilation target because it doesn't require CGO by default.

```bash
wails3 build GOOS=windows
```

This works from any host OS with no additional setup. Go's built-in cross-compilation handles everything.

**If your app requires CGO** (e.g., you're using a C library or CGO-dependent package), you'll need Docker when building from macOS or Linux:

```bash
# One-time setup
wails3 task setup:docker

# Build with CGO enabled
wails3 task windows:build CGO_ENABLED=1
```

The Taskfile detects `CGO_ENABLED=1` on non-Windows hosts and automatically uses the Docker image.

### macOS

macOS builds require CGO for WebView integration, which means cross-compilation needs special tooling.

```bash
# Build for Apple Silicon (arm64) - default
wails3 build GOOS=darwin

# Build for Intel (amd64)
wails3 build GOOS=darwin GOARCH=amd64

# Build universal binary (both architectures)
wails3 task darwin:build:universal
```

**From Linux or Windows**, you'll need to set up Docker first:

```bash
wails3 task setup:docker
```

Once the images are built, the build system detects that you're not on macOS and uses Docker automatically.

Note that cross-compiled macOS binaries are not code-signed. You'll need to sign them on macOS or in CI before distribution.

### Linux

Linux builds require CGO for WebView integration.

```bash
wails3 build GOOS=linux

# Build for specific architecture
wails3 build GOOS=linux GOARCH=amd64
wails3 build GOOS=linux GOARCH=arm64
```

**From macOS or Windows**, you'll need to set up Docker first:

```bash
wails3 task setup:docker
```

The build system detects that you're not on Linux and uses Docker automatically.

**On Linux without a C compiler**, the build system checks for `gcc` or `clang`. If neither is found, it falls back to Docker.

### ARM Architecture

All platforms support ARM64 cross-compilation using `GOARCH`:

```bash
# Windows ARM64 (Surface Pro X, Windows on ARM)
wails3 build GOOS=windows GOARCH=arm64

# Linux ARM64 (Raspberry Pi 4/5, AWS Graviton)
wails3 build GOOS=linux GOARCH=arm64

# macOS ARM64 (Apple Silicon - this is the default on macOS)
wails3 build GOOS=darwin GOARCH=arm64

# macOS Intel (amd64)
wails3 build GOOS=darwin GOARCH=amd64
```

The Docker image includes Zig cross-compiler targets for both amd64 and arm64 on all platforms.

## How It Works

### Cross-Compilation Matrix

| Host → Target | Windows | macOS | Linux |
|---------------|---------|-------|-------|
| **Windows**   | Native  | Docker | Docker |
| **macOS**     | Native Go | Native | Docker |
| **Linux**     | Native Go | Docker | Native |

- **Native** = Platform's native toolchain, no additional setup
- **Native Go** = Go's built-in cross-compilation (no CGO)
- **Docker** = Uses Docker container with cross-compilation toolchain
