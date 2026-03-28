# File Associations

File associations allow your application to handle specific file types when users open them. This is particularly useful for text editors, image viewers, or any application that works with specific file formats.

## Overview

File association support in Wails v3 is currently available for:
- Windows (NSIS installer packages)
- macOS (application bundles)

## Configuration

File associations are configured in the `config.yml` file located in your project's `build` directory.

### Basic Configuration

To set up file associations:

1. Open `build/config.yml`
2. Add your file associations under the `fileAssociations` section
3. Run `wails3 update build-assets` to update the build assets
4. Set the `FileAssociations` field in the application options
5. Package your application using `wails3 package`

Here's an example configuration:

```yaml
fileAssociations:
  - ext: myapp
    name: MyApp Document
    description: MyApp Document File
    iconName: myappFileIcon
    role: Editor
  - ext: custom
    name: Custom Format
    description: Custom File Format
    iconName: customFileIcon
    role: Editor
```

### Configuration Properties

| Property | Description | Platform |
|----------|-------------|----------|
| ext | File extension without the leading period (e.g., `txt`) | All |
| name | Display name for the file type | All |
| description | Description shown in file properties | Windows |
| iconName | Name of the icon file (without extension) in the build folder | All |
| role | Application's role for this file type (e.g., `Editor`, `Viewer`) | macOS |
| mimeType | MIME type for the file (e.g., `image/jpeg`) | macOS |

## Listening for File Open Events

To handle file open events in your application, you can listen for the `events.Common.ApplicationOpenedWithFile` event:

```go
package main

import (
    "github.com/wailsapp/wails/v3/pkg/application"
    "github.com/wailsapp/wails/v3/pkg/events"
)

func main() {
    app := application.New(application.Options{
        Name: "MyApp",
        FileAssociations: []string{".txt", ".md"},
    })

    // Listen for files being used to open the application
    app.Event.OnApplicationEvent(events.Common.ApplicationOpenedWithFile, func(event *application.ApplicationEvent) {
        associatedFile := event.Context().Filename()
        application.InfoDialog().SetMessage("Application opened with file: " + associatedFile).Show()
    })

    // Create your window and run the app...
}
```

## Step-by-Step Tutorial

Let's walk through setting up file associations for a simple text editor:

### 1. Create Icons

- Create icons for your file type (recommended sizes: 16x16, 32x32, 48x48, 256x256)
- Save the icons in your project's `build` folder
- Name them according to your `iconName` configuration (e.g., `textFileIcon.png`)

**Tip:** You can use `wails3 generate icons` to generate the required icons for you.

- For macOS add copy statement like `cp build/darwin/documenticon.icns {{.BIN_DIR}}/{{.APP_NAME}}.app/Contents/Resources` in the `create:app:bundle:` task.

### 2. Configure File Associations

Edit the `build/config.yml` file to add your file associations:

```yaml
# build/config.yml
fileAssociations:
  - ext: txt
    name: Text Document
    description: Plain Text Document
    iconName: textFileIcon
    role: Editor
```

### 3. Update Build Assets

Run the following command to update the build assets:

```bash
wails3 update build-assets
```

### 4. Set File Associations in the Application Options

In your `main.go` file, set the `FileAssociations` field in the application options:

```go
app := application.New(application.Options{
    Name: "MyApp",
    FileAssociations: []string{".txt", ".md"},
})
```
