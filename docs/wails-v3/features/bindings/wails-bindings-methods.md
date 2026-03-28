# Method Bindings

Call Go methods from JavaScript with type safety.

Wails **automatically generates type-safe JavaScript/TypeScript bindings** for your Go methods. Write Go code, run one command, and get fully-typed frontend functions with no HTTP overhead, no manual work, and zero boilerplate.

---

## Quick Start

**1. Write Go service:**

```go
type GreetService struct{}

func (g *GreetService) Greet(name string) string {
    return "Hello, " + name + "!"
}
```

**2. Register service:**

```go
app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(&GreetService{}),
    },
})
```

**3. Generate bindings:**

```bash
wails3 generate bindings
```

**4. Use in JavaScript:**

```javascript
import { Greet } from './bindings/myapp/greetservice'

const message = await Greet("World")
console.log(message)  // "Hello, World!"
```

---

## Creating Services

### Basic Service

```go
package main

import "github.com/wailsapp/wails/v3/pkg/application"

type CalculatorService struct{}

func (c *CalculatorService) Add(a, b int) int       { return a + b }
func (c *CalculatorService) Subtract(a, b int) int  { return a - b }
func (c *CalculatorService) Multiply(a, b int) int  { return a * b }

func (c *CalculatorService) Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

**Register:**

```go
app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(&CalculatorService{}),
    },
})
```

Key points: only **exported methods** (PascalCase) are bound; methods can return `(value, error)`; services are **singletons**.

### Service with State

```go
type CounterService struct {
    count int
    mu    sync.Mutex
}

func (c *CounterService) Increment() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
    return c.count
}

func (c *CounterService) Decrement() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count--
    return c.count
}

func (c *CounterService) GetCount() int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.count
}

func (c *CounterService) Reset() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count = 0
}
```

> Services are shared across all windows. Use mutexes for thread safety.

### Service with Dependencies

```go
type DatabaseService struct {
    db *sql.DB
}

func NewDatabaseService(db *sql.DB) *DatabaseService {
    return &DatabaseService{db: db}
}

func (d *DatabaseService) GetUser(id int) (*User, error) {
    var user User
    err := d.db.QueryRow("SELECT * FROM users WHERE id = ?", id).Scan(&user)
    return &user, err
}
```

**Register with dependencies:**

```go
db, _ := sql.Open("sqlite3", "app.db")

app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(NewDatabaseService(db)),
    },
})
```

---

## Generating Bindings

### Basic Generation

```bash
wails3 generate bindings
```

Output:
```
INFO  347 Packages, 3 Services, 12 Methods, 0 Enums, 0 Models in 1.98s
INFO  Output directory: /myproject/frontend/bindings
```

Generated structure:
```
frontend/bindings/
└── myapp/
    ├── calculatorservice.js
    ├── counterservice.js
    ├── databaseservice.js
    └── index.js
```

### TypeScript Generation

```bash
wails3 generate bindings -ts
```

### Custom Output Directory

```bash
wails3 generate bindings -d ./src/bindings
```

### Watch Mode (Development)

```bash
wails3 dev
```

Automatically regenerates bindings when Go code changes.

---

## Using Bindings

### JavaScript

```javascript
import { Add, Subtract, Multiply, Divide } from './bindings/myapp/calculatorservice'

const sum = await Add(5, 3)         // 8
const diff = await Subtract(10, 4)   // 6
const product = await Multiply(7, 6) // 42

try {
    const result = await Divide(10, 0)
} catch (error) {
    console.error("Error:", error)  // "division by zero"
}
```

### TypeScript

```typescript
import { Add, Divide } from './bindings/myapp/calculatorservice'

const sum: number = await Add(5, 3)

try {
    const result = await Divide(10, 0)
} catch (error: unknown) {
    if (error instanceof Error) {
        console.error(error.message)
    }
}
```

### Index Files

```javascript
// frontend/bindings/myapp/index.js
export * as CalculatorService from './calculatorservice.js'
export * as CounterService from './counterservice.js'
export * as DatabaseService from './databaseservice.js'
```

```javascript
import { CalculatorService } from './bindings/myapp'

const sum = await CalculatorService.Add(5, 3)
```

---

## Type Mapping

### Primitive Types

| Go Type | JavaScript/TypeScript |
|---|---|
| `string` | `string` |
| `bool` | `boolean` |
| `int`, `int8`, `int16`, `int32`, `int64` | `number` |
| `uint`, `uint8`, `uint16`, `uint32`, `uint64` | `number` |
| `float32`, `float64` | `number` |
| `byte` | `number` |
| `rune` | `number` |

### Complex Types

| Go Type | JavaScript/TypeScript |
|---|---|
| `[]T` | `T[]` |
| `[N]T` | `T[]` |
| `map[string]T` | `Record<string, T>` |
| `map[K]V` | `Map<K, V>` |
| `struct` | `class` (with fields) |
| `time.Time` | `Date` |
| `*T` | `T` (pointers transparent) |
| `interface{}` | `any` |
| `error` | Exception (thrown) |

### Unsupported Types

These types **cannot** be passed across the bridge: `chan T`, `func()`, complex interfaces (except `interface{}`), unexported fields.

**Workaround — use IDs or handles:**

```go
var files = make(map[string]*os.File)

func OpenFile(path string) (string, error) {
    file, err := os.Open(path)
    if err != nil {
        return "", err
    }
    id := generateID()
    files[id] = file
    return id, nil
}

func ReadFile(id string) ([]byte, error) {
    return io.ReadAll(files[id])
}

func CloseFile(id string) error {
    file := files[id]
    delete(files, id)
    return file.Close()
}
```

---

## Error Handling

**Go side:**

```go
func (d *DatabaseService) GetUser(id int) (*User, error) {
    if id <= 0 {
        return nil, errors.New("invalid user ID")
    }

    var user User
    err := d.db.QueryRow("SELECT * FROM users WHERE id = ?", id).Scan(&user)
    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("user %d not found", id)
    }
    if err != nil {
        return nil, fmt.Errorf("database error: %w", err)
    }

    return &user, nil
}
```

**JavaScript side:**

```javascript
import { GetUser } from './bindings/myapp/databaseservice'

try {
    const user = await GetUser(123)
    console.log("User:", user)
} catch (error) {
    console.error("Error:", error)  // "user 123 not found"
}
```

Go `error` → JavaScript exception, with message preserved.

---

## Performance

Typical call overhead is under 1ms, compared to 5–50ms for HTTP/REST or 1–10ms for IPC.

**Batch operations:**

```javascript
// ❌ Slow: N calls
for (const item of items) {
    await ProcessItem(item)
}

// ✅ Fast: 1 call
await ProcessItems(items)
```

**Use events for streaming:**

```go
func ProcessLargeFile(path string) error {
    for line := range lines {
        app.Event.Emit("progress", line)
    }
    return nil
}
```

---

## Complete Example

**Go:**

```go
package main

import (
    "fmt"
    "github.com/wailsapp/wails/v3/pkg/application"
)

type TodoService struct {
    todos []Todo
}

type Todo struct {
    ID        int    `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
}

func (t *TodoService) GetAll() []Todo {
    return t.todos
}

func (t *TodoService) Add(title string) Todo {
    todo := Todo{ID: len(t.todos) + 1, Title: title}
    t.todos = append(t.todos, todo)
    return todo
}

func (t *TodoService) Toggle(id int) error {
    for i := range t.todos {
        if t.todos[i].ID == id {
            t.todos[i].Completed = !t.todos[i].Completed
            return nil
        }
    }
    return fmt.Errorf("todo %d not found", id)
}

func (t *TodoService) Delete(id int) error {
    for i := range t.todos {
        if t.todos[i].ID == id {
            t.todos = append(t.todos[:i], t.todos[i+1:]...)
            return nil
        }
    }
    return fmt.Errorf("todo %d not found", id)
}

func main() {
    app := application.New(application.Options{
        Services: []application.Service{
            application.NewService(&TodoService{}),
        },
    })
    app.Window.New()
    app.Run()
}
```

**JavaScript:**

```javascript
import { GetAll, Add, Toggle, Delete } from './bindings/myapp/todoservice'

class TodoApp {
    async loadTodos() {
        const todos = await GetAll()
        this.renderTodos(todos)
    }

    async addTodo(title) {
        try {
            await Add(title)
            this.loadTodos()
        } catch (error) {
            console.error("Failed to add todo:", error)
        }
    }

    async toggleTodo(id) {
        try {
            await Toggle(id)
            this.loadTodos()
        } catch (error) {
            console.error("Failed to toggle todo:", error)
        }
    }

    async deleteTodo(id) {
        try {
            await Delete(id)
            this.loadTodos()
        } catch (error) {
            console.error("Failed to delete todo:", error)
        }
    }
}
```

---

## Best Practices

### Do

- Keep methods simple — single responsibility
- Return errors, don't panic
- Use thread-safe state — mutexes for shared data
- Batch operations to reduce bridge calls
- Cache on Go side to avoid repeated work
- Document methods — comments become JSDoc

### Don't

- Don't block — use goroutines for long operations
- Don't return channels — use events instead
- Don't return functions — not supported
- Don't ignore errors
- Don't use unexported fields — won't be bound

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Binding examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/binding)
