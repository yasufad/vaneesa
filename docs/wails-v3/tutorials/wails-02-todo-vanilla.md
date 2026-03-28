# TODO List Tutorial

Build a complete TODO list application with CRUD operations.

In this tutorial, you'll build a fully functional TODO list application. This is a step up from the QR Code Service tutorial - you'll learn how to manage state, handle multiple operations, and create a polished user interface.

**What you'll build:**
- A complete TODO app with add, complete, and delete functionality
- Thread-safe state management (important for desktop apps)
- Modern, glassmorphic UI design
- All using vanilla JavaScript - no frameworks required

**What you'll learn:**
- CRUD operations (Create, Read, Update, Delete)
- Managing mutable state safely in Go
- Handling user input and validation
- Building responsive UIs that feel native

**Time to complete:** 20 minutes

## Create Your Project

### 1. Generate the project

First, create a new Wails project:

```bash
wails3 init -n todo-app
cd todo-app
```

### 2. Create the TODO service

Delete `greetservice.go` and create a new file `todoservice.go`:

```go
package main

import (
    "errors"
    "sync"
)

type Todo struct {
    ID        int    `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
}

type TodoService struct {
    todos  []Todo
    nextID int
    mu     sync.RWMutex
}

func NewTodoService() *TodoService {
    return &TodoService{
        todos:  []Todo{},
        nextID: 1,
    }
}

func (t *TodoService) GetAll() []Todo {
    t.mu.RLock()
    defer t.mu.RUnlock()
    return t.todos
}

func (t *TodoService) Add(title string) (*Todo, error) {
    if title == "" {
        return nil, errors.New("title cannot be empty")
    }

    t.mu.Lock()
    defer t.mu.Unlock()

    todo := Todo{
        ID:        t.nextID,
        Title:     title,
        Completed: false,
    }
    t.todos = append(t.todos, todo)
    t.nextID++

    return &todo, nil
}

func (t *TodoService) Toggle(id int) error {
    t.mu.Lock()
    defer t.mu.Unlock()

    for i := range t.todos {
        if t.todos[i].ID == id {
            t.todos[i].Completed = !t.todos[i].Completed
            return nil
        }
    }
    return errors.New("todo not found")
}

func (t *TodoService) Delete(id int) error {
    t.mu.Lock()
    defer t.mu.Unlock()

    for i, todo := range t.todos {
        if todo.ID == id {
            t.todos = append(t.todos[:i], t.todos[i+1:]...)
            return nil
        }
    }
    return errors.New("todo not found")
}
```

**Key points:**
- `sync.RWMutex` provides thread-safe access to the todos slice
- `RLock()` allows multiple readers; `Lock()` gives exclusive write access
- `defer` ensures locks are released even if the function returns early

### 3. Update main.go

Register the TODO service:

```go
Services: []application.Service{
    application.NewService(NewTodoService()),
},
```

### 4. Create the frontend UI

Replace `frontend/src/main.js`:

```javascript
import {TodoService} from "../bindings/changeme";

async function loadTodos() {
    const todos = await TodoService.GetAll();
    const list = document.getElementById('todo-list');

    list.innerHTML = todos.map(todo => `
        <div class="todo ${todo.completed ? 'completed' : ''}">
            <input type="checkbox"
                   ${todo.completed ? 'checked' : ''}
                   onchange="toggleTodo(${todo.id})">
            <span>${todo.title}</span>
            <button onclick="deleteTodo(${todo.id})">Delete</button>
        </div>
    `).join('');
}

window.addTodo = async () => {
    const input = document.getElementById('todo-input');
    const title = input.value.trim();
    
    if (!title) return;
    
    await TodoService.Add(title);
    input.value = '';
    await loadTodos();
}

window.toggleTodo = async (id) => {
    await TodoService.Toggle(id);
    await loadTodos();
}

window.deleteTodo = async (id) => {
    await TodoService.Delete(id);
    await loadTodos();
}

// Load todos on startup
loadTodos();
```

Update `frontend/src/index.html` with the TODO UI:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TODO App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        #todo-input {
            flex: 1;
            padding: 10px;
            font-size: 16px;
        }
        #add-btn {
            padding: 10px 20px;
            background: #007aff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        .todo {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .todo.completed span {
            text-decoration: line-through;
            color: #999;
        }
        button {
            margin-left: auto;
            padding: 5px 10px;
            background: #ff3b30;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>TODO List</h1>
    <div class="input-group">
        <input type="text" id="todo-input" placeholder="Add a new todo...">
        <button id="add-btn" onclick="addTodo()">Add</button>
    </div>
    <div id="todo-list"></div>
    <script type="module" src="./main.js"></script>
</body>
</html>
```

### 5. Run the application

```bash
wails3 dev
```

You now have a fully functional TODO list application!
