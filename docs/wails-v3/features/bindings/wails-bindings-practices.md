# Bindings Best Practices

Design patterns and best practices for Go-JavaScript bindings.

Follow **proven patterns** for binding design to create clean, performant, and secure bindings. This guide covers API design principles, performance optimisation, security patterns, error handling, and testing strategies for maintainable applications.

---

## API Design Principles

### 1. Single Responsibility

Each service should have one clear purpose:

```go
// ❌ Bad: God object
type AppService struct{}

func (a *AppService) SaveFile(path string, data []byte) error
func (a *AppService) GetUser(id int) (*User, error)
func (a *AppService) SendEmail(to, subject, body string) error
func (a *AppService) ProcessPayment(amount float64) error

// ✅ Good: Focused services
type FileService struct{}
func (f *FileService) Save(path string, data []byte) error

type UserService struct{}
func (u *UserService) GetByID(id int) (*User, error)

type EmailService struct{}
func (e *EmailService) Send(to, subject, body string) error

type PaymentService struct{}
func (p *PaymentService) Process(amount float64) error
```

### 2. Clear Method Names

Use descriptive, action-oriented names:

```go
// ❌ Bad: Unclear names
func (s *Service) Do(x string) error
func (s *Service) Handle(data interface{}) interface{}
func (s *Service) Process(input map[string]interface{}) bool

// ✅ Good: Clear names
func (s *FileService) SaveDocument(path string, content string) error
func (s *UserService) AuthenticateUser(email, password string) (*User, error)
func (s *OrderService) CreateOrder(items []Item) (*Order, error)
```

### 3. Consistent Return Types

Always return errors explicitly:

```go
// ❌ Bad: Inconsistent error handling
func (s *Service) GetData() interface{}  // How to handle errors?
func (s *Service) SaveData(data string)  // Silent failures?

// ✅ Good: Explicit errors
func (s *Service) GetData() (Data, error)
func (s *Service) SaveData(data string) error
```

### 4. Input Validation

Validate all input on the Go side:

```go
// ✅ Good: Validate first
func (s *UserService) CreateUser(email, password string) (*User, error) {
    if !isValidEmail(email) {
        return nil, errors.New("invalid email address")
    }

    if len(password) < 8 {
        return nil, errors.New("password must be at least 8 characters")
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    user := &User{
        Email:        email,
        PasswordHash: string(hash),
    }

    return s.db.Create(user)
}
```

---

## Performance Patterns

### 1. Batch Operations

Reduce bridge calls by batching:

```go
// ✅ Good: 1 call
func (s *Service) ProcessItems(items []Item) ([]Result, error) {
    results := make([]Result, len(items))
    for i, item := range items {
        results[i] = s.processItem(item)
    }
    return results, nil
}
```

```javascript
// ❌ Bad: N calls
for (const item of items) {
    await ProcessItem(item)
}

// ✅ Good: 1 call
const results = await ProcessItems(items)
```

### 2. Pagination

Don't return huge datasets:

```go
type PageRequest struct {
    Page     int `json:"page"`
    PageSize int `json:"pageSize"`
}

type PageResponse struct {
    Items      []User `json:"items"`
    TotalItems int    `json:"totalItems"`
    TotalPages int    `json:"totalPages"`
    Page       int    `json:"page"`
}

func (s *Service) GetUsers(req PageRequest) (*PageResponse, error) {
    if req.Page < 1 { req.Page = 1 }
    if req.PageSize < 1 || req.PageSize > 100 { req.PageSize = 20 }

    total, err := s.db.Count()
    if err != nil {
        return nil, err
    }

    offset := (req.Page - 1) * req.PageSize
    users, err := s.db.Find(offset, req.PageSize)
    if err != nil {
        return nil, err
    }

    return &PageResponse{
        Items:      users,
        TotalItems: total,
        TotalPages: (total + req.PageSize - 1) / req.PageSize,
        Page:       req.Page,
    }, nil
}
```

### 3. Caching

Cache expensive operations:

```go
type CachedService struct {
    cache map[string]interface{}
    mu    sync.RWMutex
    ttl   time.Duration
}

func (s *CachedService) GetData(key string) (interface{}, error) {
    s.mu.RLock()
    if data, ok := s.cache[key]; ok {
        s.mu.RUnlock()
        return data, nil
    }
    s.mu.RUnlock()

    data, err := s.fetchData(key)
    if err != nil {
        return nil, err
    }

    s.mu.Lock()
    s.cache[key] = data
    s.mu.Unlock()

    go func() {
        time.Sleep(s.ttl)
        s.mu.Lock()
        delete(s.cache, key)
        s.mu.Unlock()
    }()

    return data, nil
}
```

### 4. Streaming with Events

Use events for streaming data instead of polling:

```go
// ✅ Good: Events
func (s *Service) ProcessLargeFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }
    defer file.Close()

    scanner := bufio.NewScanner(file)
    total, processed := 0, 0

    for scanner.Scan() { total++ }

    file.Seek(0, 0)
    scanner = bufio.NewScanner(file)

    for scanner.Scan() {
        s.processLine(scanner.Text())
        processed++

        s.app.Event.Emit("progress", map[string]interface{}{
            "processed": processed,
            "total":     total,
            "percent":   int(float64(processed) / float64(total) * 100),
        })
    }

    return scanner.Err()
}
```

```javascript
// JavaScript listens
OnEvent("progress", (data) => {
    updateProgress(data.percent)
})
```

---

## Security Patterns

### 1. Input Sanitisation

Always sanitise user input:

```go
func (s *Service) SaveComment(text string) error {
    text = strings.TrimSpace(text)
    text = html.EscapeString(text)

    if len(text) == 0 {
        return errors.New("comment cannot be empty")
    }
    if len(text) > 1000 {
        return errors.New("comment too long")
    }

    return s.db.SaveComment(text)
}
```

### 2. Authentication

Protect sensitive operations:

```go
type AuthService struct {
    sessions map[string]*Session
    mu       sync.RWMutex
}

func (a *AuthService) Login(email, password string) (string, error) {
    user, err := a.db.FindByEmail(email)
    if err != nil {
        return "", errors.New("invalid credentials")
    }

    if !a.verifyPassword(user.PasswordHash, password) {
        return "", errors.New("invalid credentials")
    }

    token := generateToken()
    a.mu.Lock()
    a.sessions[token] = &Session{
        UserID:    user.ID,
        ExpiresAt: time.Now().Add(24 * time.Hour),
    }
    a.mu.Unlock()

    return token, nil
}

func (a *AuthService) requireAuth(token string) (*Session, error) {
    a.mu.RLock()
    session, ok := a.sessions[token]
    a.mu.RUnlock()

    if !ok {
        return nil, errors.New("not authenticated")
    }

    if time.Now().After(session.ExpiresAt) {
        return nil, errors.New("session expired")
    }

    return session, nil
}

// Protected method
func (a *AuthService) DeleteAccount(token string) error {
    session, err := a.requireAuth(token)
    if err != nil {
        return err
    }

    return a.db.DeleteUser(session.UserID)
}
```

### 3. Rate Limiting

Prevent abuse:

```go
type RateLimiter struct {
    requests map[string][]time.Time
    mu       sync.Mutex
    limit    int
    window   time.Duration
}

func (r *RateLimiter) Allow(key string) bool {
    r.mu.Lock()
    defer r.mu.Unlock()

    now := time.Now()

    if requests, ok := r.requests[key]; ok {
        var recent []time.Time
        for _, t := range requests {
            if now.Sub(t) < r.window {
                recent = append(recent, t)
            }
        }
        r.requests[key] = recent
    }

    if len(r.requests[key]) >= r.limit {
        return false
    }

    r.requests[key] = append(r.requests[key], now)
    return true
}

func (s *Service) SendEmail(to, subject, body string) error {
    if !s.rateLimiter.Allow(to) {
        return errors.New("rate limit exceeded")
    }

    return s.emailer.Send(to, subject, body)
}
```

---

## Error Handling Patterns

### 1. Descriptive Errors

Provide context in errors:

```go
// ✅ Good: Contextual errors
func (s *Service) LoadFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to load file %s: %w", path, err)
    }
    return data, nil
}
```

### 2. Error Types

Use typed errors for specific handling:

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

type NotFoundError struct {
    Resource string
    ID       interface{}
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s not found: %v", e.Resource, e.ID)
}

func (s *UserService) GetUser(id int) (*User, error) {
    if id <= 0 {
        return nil, &ValidationError{Field: "id", Message: "must be positive"}
    }

    user, err := s.db.Find(id)
    if err == sql.ErrNoRows {
        return nil, &NotFoundError{Resource: "User", ID: id}
    }
    if err != nil {
        return nil, fmt.Errorf("database error: %w", err)
    }

    return user, nil
}
```

### 3. Error Recovery with Retry

```go
func (s *Service) ProcessWithRetry(data string) error {
    maxRetries := 3

    for attempt := 1; attempt <= maxRetries; attempt++ {
        err := s.process(data)
        if err == nil {
            return nil
        }

        s.app.Logger.Warn("Process failed", "attempt", attempt, "error", err)

        // Don't retry on validation errors
        if _, ok := err.(*ValidationError); ok {
            return err
        }

        if attempt < maxRetries {
            time.Sleep(time.Duration(attempt) * time.Second)
        }
    }

    return fmt.Errorf("failed after %d attempts", maxRetries)
}
```

---

## Testing Patterns

### 1. Unit Testing

```go
func TestUserService_CreateUser(t *testing.T) {
    db := &MockDB{}
    service := &UserService{db: db}

    user, err := service.CreateUser("test@example.com", "password123")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Email != "test@example.com" {
        t.Errorf("expected email test@example.com, got %s", user.Email)
    }

    _, err = service.CreateUser("invalid", "password123")
    if err == nil {
        t.Error("expected error for invalid email")
    }

    _, err = service.CreateUser("test@example.com", "short")
    if err == nil {
        t.Error("expected error for short password")
    }
}
```

### 2. Integration Testing

```go
func TestUserService_Integration(t *testing.T) {
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    _, err = db.Exec(`CREATE TABLE users (...)`)
    if err != nil {
        t.Fatal(err)
    }

    service := &UserService{db: db}

    user, err := service.CreateUser("test@example.com", "password123")
    if err != nil {
        t.Fatal(err)
    }

    var count int
    db.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", user.Email).Scan(&count)

    if count != 1 {
        t.Errorf("expected 1 user, got %d", count)
    }
}
```

### 3. Mock Services

Create testable interfaces:

```go
type UserRepository interface {
    Create(user *User) error
    FindByEmail(email string) (*User, error)
    Update(user *User) error
    Delete(id int) error
}

type UserService struct {
    repo UserRepository
}

// Mock for testing
type MockUserRepository struct {
    users map[string]*User
}

func (m *MockUserRepository) Create(user *User) error {
    m.users[user.Email] = user
    return nil
}

func TestUserService_WithMock(t *testing.T) {
    mock := &MockUserRepository{users: make(map[string]*User)}
    service := &UserService{repo: mock}

    _, err := service.CreateUser("test@example.com", "password123")
    if err != nil {
        t.Fatal(err)
    }

    if len(mock.users) != 1 {
        t.Error("expected 1 user in mock")
    }
}
```

---

## Best Practices Summary

### Do

- **Single responsibility** — one service, one purpose
- **Clear naming** — descriptive method names
- **Validate input** — always on Go side
- **Return errors** — explicit error handling
- **Batch operations** — reduce bridge calls
- **Use events** — for streaming data
- **Sanitise input** — prevent injection
- **Test thoroughly** — unit and integration tests
- **Document methods** — comments become JSDoc
- **Version your API** — plan for changes

### Don't

- **Don't create god objects** — keep services focused
- **Don't trust frontend** — validate everything
- **Don't return huge datasets** — use pagination
- **Don't block** — use goroutines for long operations
- **Don't ignore errors** — handle all error cases
- **Don't skip testing** — test early and often
- **Don't hardcode** — use configuration
- **Don't expose internals** — keep implementation private

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Binding examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/binding)
