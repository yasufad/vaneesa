# CLI Reference

Complete reference for the Wails CLI commands.

The Wails CLI provides a comprehensive set of commands to help you develop, build, and maintain your Wails applications.

## Core Commands

Core commands are the primary commands used for project creation, development, and building.

All CLI commands are of the following format: `wails3 <command>`.

### init

Initializes a new Wails project. During this initialization, the `go mod tidy` command is run to bring the project packages up to date. This can be bypassed by using the `-skipgomodtidy` flag.

```bash
wails3 init [flags]
```

**Flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `-p` | Package name | `main` |
| `-t` | Template name or URL | `vanilla` |
| `-n` | Project name | |
| `-d` | Project directory | `.` |
| `-q` | Suppress output | `false` |
| `-l` | List templates | `false` |
| `-git` | Git repository URL | |
| `-productname` | Product name | `My Product` |
| `-productdescription` | Product description | `My Product Description` |
| `-productversion` | Product version | `0.1.0` |
| `-productcompany` | Company name | `My Company` |
| `-productcopyright` | Copyright notice | `now, My Company` |
| `-productcomments` | File comments | `This is a comment` |
| `-productidentifier` | Product identifier | |
| `-skipgomodtidy` | Skip go mod tidy | `false` |

The `-git` flag accepts various Git URL formats:
- HTTPS: `https://github.com/username/project`
- SSH: `git@github.com:username/project` or `ssh://git@github.com/username/project`
- Git protocol: `git://github.com/username/project`
- Filesystem: `file:///path/to/project.git`

When provided, this flag will:
1. Initialize a git repository in the project directory
2. Set the specified URL as the remote origin
3. Update the module name in `go.mod` to match the repository URL
4. Add all files

### dev

Runs the application in development mode. This will give you a live view of your frontend code, and you can make changes and see them reflected in the running application without having to rebuild the entire application.

```bash
wails3 dev [flags]
```

**Flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `-config` | Config file path | `./build/config.yml` |
| `-port` | Vite dev server port | `9245` |
| `-s` | Enable HTTPS | `false` |

**Note:** This is equivalent to running `wails3 task dev` and runs the `dev` task in the project's main Taskfile.

### build

Builds a debug version of your application. It defaults to building for the current platform and architecture.

```bash
wails3 build [CLI variables...]
```

You can pass CLI variables to customize the build:
```bash
wails3 build PLATFORM=linux CONFIG=production
```

**Note:** This is equivalent to running `wails3 task build` which runs the `build` task in the project's main Taskfile.

### package

Creates platform-specific packages for distribution.

```bash
wails3 package [CLI variables...]
```

You can pass CLI variables to customize the packaging:
```bash
wails3 package VERSION=2.0.0 OUTPUT=myapp.pkg
```

#### Package Types

| Platform | Package Type |
|----------|-------------|
| Windows | `.exe` |
| macOS | `.app` |
| Linux | `.AppImage`, `.deb`, `.rpm`, `.archlinux` |

**Note:** This is equivalent to `wails3 task package` which runs the `package` task in the project's main Taskfile.

### task

Runs tasks defined in your project's Taskfile.yml. This is an embedded version of [Taskfile](https://taskfile.dev) that allows you to define and run custom build, test, and deployment tasks.

```bash
wails3 task [taskname] [CLI variables...] [flags]
```

#### CLI Variables

You can pass variables to tasks in the format `KEY=VALUE`:
```bash
wails3 task build PLATFORM=linux CONFIG=production
wails3 task deploy ENV=staging VERSION=1.2.3
```

These variables can be accessed in your Taskfile.yml using Go template syntax:
```yaml
tasks:
  build:
    cmds:
      - echo "Building for {{.PLATFORM | default "darwin"}}"
      - echo "Config: {{.CONFIG | default "debug"}}"
```

**Flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `-h` | Shows Task usage | `false` |
| `-i` | Creates a new Taskfile.yml | `false` |
| `-list` | Lists tasks with descriptions | `false` |
| `-list-all` | Lists all tasks | `false` |
| `-json` | Formats task list as JSON | `false` |
