# Notes Application Tutorial

Build a notes application with file operations and native dialogs.

In this tutorial, you'll build a notes application that demonstrates file operations, native dialogs, and modern desktop app patterns using Wails v3.

## What You'll Build

- A complete notes app with create, edit, and delete functionality
- Native file save/open dialogs for importing and exporting notes
- Auto-save on typing with debounce to reduce unnecessary updates
- Professional two-column layout (sidebar + editor) mimicking Apple Notes

## What You'll Learn

- Using native file dialogs in Wails
- Working with JSON files for data persistence
- Implementing debounced auto-save patterns
- Building professional desktop UIs with modern CSS
- Proper Go struct JSON serialization

## Project Setup

### 1. Create a new Wails project

```bash
wails3 init -n notes-app -t vanilla
cd notes-app
```

### 2. Create the NotesService

Create a new file `notesservice.go` in the project root:

```go
package main

import (
    "encoding/json"
    "errors"
    "os"
    "time"

    "github.com/wailsapp/wails/v3/pkg/application"
)

type Note struct {
    ID        string    `json:"id"`
    Title     string    `json:"title"`
    Content   string    `json:"content"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

type NotesService struct {
    notes []Note
}

func NewNotesService() *NotesService {
    return &NotesService{
        notes: make([]Note, 0),
    }
}

// GetAll returns all notes
func (n *NotesService) GetAll() []Note {
    return n.notes
}

// Create creates a new note
func (n *NotesService) Create(title, content string) Note {
    note := Note{
        ID:        generateID(),
        Title:     title,
        Content:   content,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    n.notes = append(n.notes, note)
    return note
}

// Update updates an existing note
func (n *NotesService) Update(id, title, content string) error {
    for i := range n.notes {
        if n.notes[i].ID == id {
            n.notes[i].Title = title
            n.notes[i].Content = content
            n.notes[i].UpdatedAt = time.Now()
            return nil
        }
    }
    return errors.New("note not found")
}

// Delete deletes a note
func (n *NotesService) Delete(id string) error {
    for i := range n.notes {
        if n.notes[i].ID == id {
            n.notes = append(n.notes[:i], n.notes[i+1:]...)
            return nil
        }
    }
    return errors.New("note not found")
}

// SaveToFile saves notes to a file
func (n *NotesService) SaveToFile() error {
    path, err := application.Get().Dialog.SaveFile().
        SetFilename("notes.json").
        AddFilter("JSON Files", "*.json").
        PromptForSingleSelection()

    if err != nil {
        return err
    }

    data, err := json.MarshalIndent(n.notes, "", "  ")
    if err != nil {
        return err
    }

    if err := os.WriteFile(path, data, 0644); err != nil {
        return err
    }

    application.Get().Dialog.Info().
        SetTitle("Success").
        SetMessage("Notes saved successfully!").
        Show()

    return nil
}

// LoadFromFile loads notes from a file
func (n *NotesService) LoadFromFile() error {
    path, err := application.Get().Dialog.OpenFile().
        AddFilter("JSON Files", "*.json").
        PromptForSingleSelection()

    if err != nil {
        return err
    }

    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }

    var notes []Note
    if err := json.Unmarshal(data, &notes); err != nil {
        return err
    }

    n.notes = notes

    application.Get().Dialog.Info().
        SetTitle("Success").
        SetMessage("Notes loaded successfully!").
        Show()

    return nil
}

func generateID() string {
    return time.Now().Format("20060102150405")
}
```

### 3. Update main.go

Replace the contents of `main.go`:

```go
package main

import (
    "embed"
    "log"

    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed frontend/dist
var assets embed.FS

func main() {
    app := application.New(application.Options{
        Name:        "Notes App",
        Description: "A simple notes application",
        Services: []application.Service{
            application.NewService(NewNotesService()),
        },
        Assets: application.AssetOptions{
            Handler: application.AssetFileServerFS(assets),
        },
    })

    app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title:  "Notes App",
        Width:  1024,
        Height: 768,
    })

    err := app.Run()
    if err != nil {
        log.Fatal(err)
    }
}
```

### 4. Create the frontend

Update `frontend/src/main.js` with the notes app logic including debounced auto-save.

Update `frontend/src/index.html` with a two-column layout (sidebar for notes list, main area for editor).

### 5. Run the application

```bash
wails3 dev
```

You now have a fully functional notes application with native file dialogs!
