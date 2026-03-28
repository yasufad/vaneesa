# Services

Build modular, reusable application components with services.

Wails **services** provide a structured way to organise application logic with modular, self-contained components. Services are lifecycle-aware with startup and shutdown hooks, automatically bound to the frontend, dependency-injectable, and fully testable in isolation.

---

## Quick Start

```go
type GreetService struct {
    prefix string
}

func NewGreetService(prefix string) *GreetService {
    return &GreetService{prefix: prefix}
}

func (g *GreetService) Greet(name string) string {
    return g.prefix + name + "!"
}

app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(NewGreetService("Hello, ")),
    },
})
```

```javascript
import { Greet } from './bindings/main/GreetService'

const message = await Greet("World")
console.log(message)  // "Hello, World!"
```

---

## Creating Services

### Basic Service

```go
type CalculatorService struct{}

func (c *CalculatorService) Add(a, b int) int      { return a + b }
func (c *CalculatorService) Subtract(a, b int) int { return a - b }
```

Key points: only **exported methods** are bound; services are **singletons**; methods can return `(value, error)`.

### Service with State

```go
type CounterService struct {
    count int
    mu    sync.RWMutex
}

func (c *CounterService) Increment() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
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

> Services are shared across all windows — always use mutexes for thread safety.

### Service with Dependencies

```go
type UserService struct {
    db     *sql.DB
    logger *slog.Logger
}

func NewUserService(db *sql.DB, logger *slog.Logger) *UserService {
    return &UserService{db: db, logger: logger}
}

func (u *UserService) GetUser(id int) (*User, error) {
    u.logger.Info("Getting user", "id", id)

    var user User
    err := u.db.QueryRow("SELECT * FROM users WHERE id = ?", id).Scan(&user)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }

    return &user, nil
}
```

**Register with dependencies:**

```go
db, _ := sql.Open("sqlite3", "app.db")
logger := slog.Default()

app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(NewUserService(db, logger)),
    },
})
```

---

## Service Lifecycle

### ServiceStartup

Called when the application starts:

```go
func (u *UserService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
    u.logger.Info("UserService starting up")

    if err := u.db.Ping(); err != nil {
        return fmt.Errorf("database not available: %w", err)
    }

    if err := u.runMigrations(); err != nil {
        return fmt.Errorf("migrations failed: %w", err)
    }

    go u.backgroundSync(ctx)

    return nil
}
```

Use cases: initialise resources, validate configuration, run migrations, start background tasks, connect to external services.

Key notes: services start in **registration order**; returning an error **prevents app startup**; use `ctx` for cancellation.

### ServiceShutdown

Called when the application shuts down:

```go
func (u *UserService) ServiceShutdown() error {
    u.logger.Info("UserService shutting down")

    if err := u.db.Close(); err != nil {
        return fmt.Errorf("failed to close database: %w", err)
    }

    u.cleanup()

    return nil
}
```

Use cases: close connections, save state, cleanup resources, flush buffers, cancel background tasks.

Key notes: services shut down in **reverse order**; returning an error logs a warning but does not prevent shutdown.

### Complete Lifecycle Example

```go
type DatabaseService struct {
    db     *sql.DB
    logger *slog.Logger
    cancel context.CancelFunc
}

func (d *DatabaseService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
    d.logger.Info("Starting database service")

    db, err := sql.Open("sqlite3", "app.db")
    if err != nil {
        return fmt.Errorf("failed to open database: %w", err)
    }
    d.db = db

    if err := db.Ping(); err != nil {
        return fmt.Errorf("database not available: %w", err)
    }

    ctx, cancel := context.WithCancel(ctx)
    d.cancel = cancel
    go d.periodicCleanup(ctx)

    return nil
}

func (d *DatabaseService) ServiceShutdown() error {
    d.logger.Info("Shutting down database service")

    if d.cancel != nil {
        d.cancel()
    }

    if d.db != nil {
        if err := d.db.Close(); err != nil {
            return fmt.Errorf("failed to close database: %w", err)
        }
    }

    return nil
}

func (d *DatabaseService) periodicCleanup(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            d.cleanup()
        }
    }
}
```

---

## Service Options

### Custom Name

```go
app := application.New(application.Options{
    Services: []application.Service{
        application.NewServiceWithOptions(&MyService{}, application.ServiceOptions{
            Name: "CustomServiceName",
        }),
    },
})
```

### HTTP Routes

Services can handle HTTP requests:

```go
type FileService struct {
    root string
}

func (f *FileService) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    http.FileServer(http.Dir(f.root)).ServeHTTP(w, r)
}

app := application.New(application.Options{
    Services: []application.Service{
        application.NewServiceWithOptions(&FileService{root: "./files"}, application.ServiceOptions{
            Route: "/files",
        }),
    },
})
```

Access via `http://wails.localhost/files/...`. Use cases include file serving, custom APIs, WebSocket endpoints, and media streaming.

---

## Service Patterns

### Repository Pattern

```go
type UserRepository struct {
    db *sql.DB
}

func (r *UserRepository) GetByID(id int) (*User, error) { /* database query */ }
func (r *UserRepository) Create(user *User) error        { /* insert user */ }
func (r *UserRepository) Update(user *User) error        { /* update user */ }
func (r *UserRepository) Delete(id int) error            { /* delete user */ }
```

### Service Layer Pattern

```go
type UserService struct {
    repo   *UserRepository
    logger *slog.Logger
}

func (s *UserService) RegisterUser(email, password string) (*User, error) {
    if !isValidEmail(email) {
        return nil, errors.New("invalid email")
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    user := &User{
        Email:        email,
        PasswordHash: string(hash),
        CreatedAt:    time.Now(),
    }

    if err := s.repo.Create(user); err != nil {
        return nil, err
    }

    s.logger.Info("User registered", "email", email)
    return user, nil
}
```

### Factory Pattern

```go
type ServiceFactory struct {
    db     *sql.DB
    logger *slog.Logger
}

func (f *ServiceFactory) CreateUserService() *UserService {
    return &UserService{repo: &UserRepository{db: f.db}, logger: f.logger}
}

func (f *ServiceFactory) CreateOrderService() *OrderService {
    return &OrderService{repo: &OrderRepository{db: f.db}, logger: f.logger}
}
```

### Event-Driven Pattern

```go
type OrderService struct {
    app *application.Application
}

func (o *OrderService) CreateOrder(items []Item) (*Order, error) {
    order := &Order{Items: items, CreatedAt: time.Now()}

    if err := o.saveOrder(order); err != nil {
        return nil, err
    }

    o.app.Event.Emit("order-created", order)

    return order, nil
}
```

---

## Dependency Injection

### Constructor Injection

```go
func NewEmailService(smtp *smtp.Client, logger *slog.Logger) *EmailService {
    return &EmailService{smtp: smtp, logger: logger}
}

app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(NewEmailService(smtpClient, logger)),
    },
})
```

### Application Injection

```go
type NotificationService struct {
    app *application.Application
}

func (n *NotificationService) Notify(message string) {
    n.app.Event.Emit("notification", message)
}

// Register after app creation
app := application.New(application.Options{})
app.RegisterService(application.NewService(NewNotificationService(app)))
```

### Service-to-Service Dependencies

```go
userService := &UserService{}
emailService := &EmailService{}
orderService := NewOrderService(userService, emailService)

app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(userService),
        application.NewService(emailService),
        application.NewService(orderService),
    },
})
```

---

## Testing Services

### Unit Testing

```go
func TestCalculatorService_Add(t *testing.T) {
    calc := &CalculatorService{}

    result := calc.Add(2, 3)

    if result != 5 {
        t.Errorf("expected 5, got %d", result)
    }
}
```

### Testing with Dependencies

```go
func TestUserService_GetUser(t *testing.T) {
    db, mock, _ := sqlmock.New()
    defer db.Close()

    rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(1, "Alice")
    mock.ExpectQuery("SELECT").WillReturnRows(rows)

    service := NewUserService(db, slog.Default())

    user, err := service.GetUser(1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("expected Alice, got %s", user.Name)
    }
}
```

### Testing Lifecycle

```go
func TestDatabaseService_Lifecycle(t *testing.T) {
    service := NewDatabaseService(slog.Default())

    ctx := context.Background()
    err := service.ServiceStartup(ctx, application.ServiceOptions{})
    if err != nil {
        t.Fatalf("startup failed: %v", err)
    }

    // Test functionality...

    err = service.ServiceShutdown()
    if err != nil {
        t.Fatalf("shutdown failed: %v", err)
    }
}
```

---

## Best Practices

### Do

- Single responsibility — one service, one purpose
- Constructor injection — pass dependencies explicitly
- Thread-safe state — use mutexes
- Return errors, don't panic
- Log important events with structured logging
- Test in isolation — mock dependencies

### Don't

- Don't use global state
- Don't block startup — keep `ServiceStartup` fast
- Don't ignore shutdown — always clean up
- Don't create circular dependencies
- Don't expose internal methods
- Don't forget thread safety — services are shared

---

## Complete Example

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log/slog"
    "sync"
    "time"

    "github.com/wailsapp/wails/v3/pkg/application"
    _ "github.com/mattn/go-sqlite3"
)

type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"createdAt"`
}

type UserService struct {
    db     *sql.DB
    logger *slog.Logger
    cache  map[int]*User
    mu     sync.RWMutex
}

func NewUserService(logger *slog.Logger) *UserService {
    return &UserService{logger: logger, cache: make(map[int]*User)}
}

func (u *UserService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
    u.logger.Info("Starting UserService")

    db, err := sql.Open("sqlite3", "users.db")
    if err != nil {
        return fmt.Errorf("failed to open database: %w", err)
    }
    u.db = db

    _, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    if err != nil {
        return fmt.Errorf("failed to create table: %w", err)
    }

    return u.loadCache()
}

func (u *UserService) ServiceShutdown() error {
    u.logger.Info("Shutting down UserService")
    if u.db != nil {
        return u.db.Close()
    }
    return nil
}

func (u *UserService) GetUser(id int) (*User, error) {
    u.mu.RLock()
    if user, ok := u.cache[id]; ok {
        u.mu.RUnlock()
        return user, nil
    }
    u.mu.RUnlock()

    var user User
    err := u.db.QueryRow(
        "SELECT id, name, email, created_at FROM users WHERE id = ?", id,
    ).Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)

    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("user %d not found", id)
    }
    if err != nil {
        return nil, fmt.Errorf("database error: %w", err)
    }

    u.mu.Lock()
    u.cache[id] = &user
    u.mu.Unlock()

    return &user, nil
}

func (u *UserService) CreateUser(name, email string) (*User, error) {
    result, err := u.db.Exec(
        "INSERT INTO users (name, email) VALUES (?, ?)", name, email,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    id, _ := result.LastInsertId()
    user := &User{ID: int(id), Name: name, Email: email, CreatedAt: time.Now()}

    u.mu.Lock()
    u.cache[int(id)] = user
    u.mu.Unlock()

    u.logger.Info("User created", "id", id, "email", email)
    return user, nil
}

func main() {
    app := application.New(application.Options{
        Name: "User Management",
        Services: []application.Service{
            application.NewService(NewUserService(slog.Default())),
        },
    })

    app.Window.New()
    app.Run()
}
```

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Service examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples)
