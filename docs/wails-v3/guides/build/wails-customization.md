# Build Customization

Customize your build process using Task and Taskfile.yml.

## Overview

The Wails build system is a flexible and powerful tool designed to streamline the build process for your Wails applications. It leverages [Task](https://taskfile.dev), a task runner that allows you to define and run tasks easily.

## Task: The Heart of the Build System

[Task](https://taskfile.dev) is a modern alternative to Make, written in Go. It uses a YAML file to define tasks and their dependencies.

The main `Taskfile.yml` is located in the project root, while platform-specific tasks are defined in `build/<platform>/Taskfile.yml` files.

```
Project Root
├── Taskfile.yml
└── build/
    ├── windows/Taskfile.yml
    ├── darwin/Taskfile.yml
    ├── linux/Taskfile.yml
    └── Taskfile.yml
```

## Taskfile.yml

The `Taskfile.yml` file in the project root is the main entry point for the build system:

```yaml
version: '3'

includes:
  common: ./build/Taskfile.yml
  windows: ./build/windows/Taskfile.yml
  darwin: ./build/darwin/Taskfile.yml
  linux: ./build/linux/Taskfile.yml

vars:
  APP_NAME: "myproject"
  BIN_DIR: "bin"
  VITE_PORT: '{{.WAILS_VITE_PORT | default 9245}}'

tasks:
  build:
    summary: Builds the application
    cmds:
      - task: "{{OS}}:build"

  package:
    summary: Packages a production build of the application
    cmds:
      - task: "{{OS}}:package"

  run:
    summary: Runs the application
    cmds:
      - task: "{{OS}}:run"

  dev:
    summary: Runs the application in development mode
    cmds:
      - wails3 dev -config ./build/config.yml -port {{.VITE_PORT}}
```

## Platform-Specific Taskfiles

Each platform has its own Taskfile, located in the platform directories beneath the `build` directory.

### Windows

Location: `build/windows/Taskfile.yml`

The Windows-specific Taskfile includes tasks for building, packaging, and running the application on Windows. Key features include:
- Building with optional production flags
- Generating `.ico` icon file
- Generating Windows `.syso` file
- Creating an NSIS installer for packaging

### Linux

Location: `build/linux/Taskfile.yml`

The Linux-specific Taskfile includes tasks for building, packaging, and running the application on Linux. Key features include:
- Building with optional production flags
- Creating an AppImage, deb, rpm, and Arch Linux packages
- Generating `.desktop` file for Linux applications

### macOS

Location: `build/darwin/Taskfile.yml`

The macOS-specific Taskfile includes tasks for building, packaging, and running the application on macOS. Key features include:
- Building binaries for amd64, arm64 and universal (both) architectures
- Generating `.icns` icon file
- Creating an `.app` bundle for distributing
- Ad-hoc signing `.app` bundles
- Setting macOS-specific build flags and environment variables

## Task Execution and Command Aliases

The `wails3 task` command is an embedded version of [Taskfile](https://taskfile.dev), which executes the tasks defined in your `Taskfile.yml`.

The `wails3 build` and `wails3 package` commands are aliases for `wails3 task build` and `wails3 task package` respectively.

### Passing Parameters to Tasks

You can pass CLI variables to tasks using the `KEY=VALUE` format:

```bash
# These are equivalent:
wails3 build PLATFORM=linux CONFIG=production
wails3 task build PLATFORM=linux CONFIG=production
```
