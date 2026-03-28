# Data Models

Bind complex data structures between Go and JavaScript.

Wails **automatically generates JavaScript/TypeScript classes** from Go structs, providing full type safety when passing complex data between backend and frontend. Write Go structs, generate bindings, and get fully-typed frontend models complete with constructors, type annotations, and JSDoc comments.

---

## Quick Start

**Go struct:**

```go
type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"createdAt"`
}

func (s *UserService) GetUser(id int) (*User, error) {
    // Return user
}
```

**Generate:**

```bash
wails3 generate bindings
```

**JavaScript:**

```javascript
import { GetUser } from './bindings/myapp/userservice'
import { User } from './bindings/myapp/models'

const user = await GetUser(1)
console.log(user.Name)  // Type-safe!
```

---

## Defining Models

### Basic Struct

```go
type Person struct {
    Name string
    Age  int
}
```

Generated JavaScript:

```javascript
export class Person {
    /** @type {string} */
    Name = ""

    /** @type {number} */
    Age = 0

    constructor(source = {}) {
        Object.assign(this, source)
    }

    static createFrom(source = {}) {
        return new Person(source)
    }
}
```

### With JSON Tags

```go
type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"createdAt"`
}
```

JSON tags control field names in JavaScript — `ID` becomes `id`, `CreatedAt` becomes `createdAt`, etc.

### With Comments

```go
// User represents an application user
type User struct {
    // Unique identifier
    ID int `json:"id"`

    // Full name of the user
    Name string `json:"name"`

    // Email address (must be unique)
    Email string `json:"email"`
}
```

Comments become JSDoc and show in your IDE on hover.

### Nested Structs

```go
type Address struct {
    Street  string `json:"street"`
    City    string `json:"city"`
    Country string `json:"country"`
}

type User struct {
    ID      int     `json:"id"`
    Name    string  `json:"name"`
    Address Address `json:"address"`
}
```

```javascript
const user = new User({
    id: 1,
    name: "Alice",
    address: new Address({
        street: "123 Main St",
        city: "Springfield",
        country: "USA"
    })
})
```

### Arrays and Slices

```go
type Team struct {
    Name    string   `json:"name"`
    Members []string `json:"members"`
}
```

Generated as `string[]` in JavaScript/TypeScript.

### Maps

```go
type Config struct {
    Settings map[string]string `json:"settings"`
}
```

Generated as `Record<string, string>` in TypeScript.

---

## Type Mapping

### Primitive Types

| Go Type | JavaScript Type |
|---|---|
| `string` | `string` |
| `bool` | `boolean` |
| `int`, `int8`, `int16`, `int32`, `int64` | `number` |
| `uint`, `uint8`, `uint16`, `uint32`, `uint64` | `number` |
| `float32`, `float64` | `number` |
| `byte` | `number` |
| `rune` | `number` |

### Special Types

| Go Type | JavaScript Type |
|---|---|
| `time.Time` | `Date` |
| `[]byte` | `Uint8Array` |
| `*T` | `T` (pointers transparent) |
| `interface{}` | `any` |

### Collections

| Go Type | JavaScript Type |
|---|---|
| `[]T` | `T[]` |
| `[N]T` | `T[]` |
| `map[string]T` | `Record<string, T>` |
| `map[K]V` | `Map<K, V>` |

### Unsupported Types

`chan T`, `func()`, complex interfaces (except `interface{}`), and unexported fields are not supported.

---

## Using Models

### Creating Instances

```javascript
import { User } from './bindings/myapp/models'

const user1 = new User()                                      // Empty
const user2 = new User({ id: 1, name: "Alice" })              // With data
const user3 = User.createFrom('{"id":1,"name":"Alice"}')      // From JSON string
const user4 = User.createFrom({ id: 1, name: "Alice" })       // From object
```

### Passing to Go

```javascript
import { CreateUser } from './bindings/myapp/userservice'
import { User } from './bindings/myapp/models'

const user = new User({ name: "Bob", email: "bob@example.com" })
const created = await CreateUser(user)
console.log("Created user:", created.id)
```

### Receiving from Go

```javascript
const user = await GetUser(1)
// user is already a User instance
console.log(user.name)
console.log(user.createdAt.toISOString())
```

### Updating Models

```javascript
const user = await GetUser(1)
user.name = "Alice Smith"
user.email = "alice.smith@example.com"
await UpdateUser(user)
```

---

## TypeScript Support

```bash
wails3 generate bindings -ts
```

Generated TypeScript:

```typescript
export class User {
    id: number = 0
    name: string = ""
    email: string = ""
    createdAt: Date = new Date()

    constructor(source: Partial<User> = {}) {
        Object.assign(this, source)
    }

    static createFrom(source: string | Partial<User> = {}): User {
        const parsedSource = typeof source === 'string'
            ? JSON.parse(source)
            : source
        return new User(parsedSource)
    }
}
```

Usage:

```typescript
const user: User = await GetUser(1)
console.log(user.name.toUpperCase())   // ✅ string method
console.log(user.id + 1)               // ✅ number operation
console.log(user.createdAt.getTime())  // ✅ Date method
```

---

## Advanced Patterns

### Optional Fields

```go
type User struct {
    ID       int     `json:"id"`
    Name     string  `json:"name"`
    Nickname *string `json:"nickname,omitempty"`
}
```

```javascript
if (user.nickname) {
    console.log("Nickname:", user.nickname)
}
```

### Enums

The binding generator automatically detects Go named types with constants and generates TypeScript enums or JavaScript const objects:

```go
type UserRole string

const (
    RoleAdmin UserRole = "admin"
    RoleUser  UserRole = "user"
    RoleGuest UserRole = "guest"
)
```

Generated TypeScript:

```typescript
export enum UserRole {
    $zero = "",
    RoleAdmin = "admin",
    RoleUser = "user",
    RoleGuest = "guest",
}
```

```javascript
import { User, UserRole } from './bindings/myapp/models'

const admin = new User({ name: "Admin", role: UserRole.RoleAdmin })
```

For full enum coverage see the [Enums](#) page.

### Serialisation

```javascript
const json = JSON.stringify(user)           // To JSON
const user = User.createFrom(json)          // From JSON
const obj = { ...user }                     // To plain object
const user2 = new User(obj)                 // From plain object
```

---

## Complete Example

**Go:**

```go
package main

import (
    "time"
    "github.com/wailsapp/wails/v3/pkg/application"
)

type Address struct {
    Street  string `json:"street"`
    City    string `json:"city"`
    Country string `json:"country"`
}

type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    Address   Address   `json:"address"`
    CreatedAt time.Time `json:"createdAt"`
}

type UserService struct {
    users []User
}

func (s *UserService) GetAll() []User { return s.users }

func (s *UserService) GetByID(id int) (*User, error) {
    for _, user := range s.users {
        if user.ID == id {
            return &user, nil
        }
    }
    return nil, fmt.Errorf("user %d not found", id)
}

func (s *UserService) Create(user User) User {
    user.ID = len(s.users) + 1
    user.CreatedAt = time.Now()
    s.users = append(s.users, user)
    return user
}

func main() {
    app := application.New(application.Options{
        Services: []application.Service{
            application.NewService(&UserService{}),
        },
    })
    app.Window.New()
    app.Run()
}
```

**JavaScript:**

```javascript
import { GetAll, GetByID, Create, Update } from './bindings/myapp/userservice'
import { User, Address } from './bindings/myapp/models'

class UserManager {
    async loadUsers() {
        const users = await GetAll()
        this.renderUsers(users)
    }

    async createUser(name, email, address) {
        const user = new User({
            name,
            email,
            address: new Address(address)
        })

        try {
            const created = await Create(user)
            console.log("Created user:", created.id)
            this.loadUsers()
        } catch (error) {
            console.error("Failed to create user:", error)
        }
    }

    renderUsers(users) {
        const list = document.getElementById('users')
        list.innerHTML = users.map(user => `
            <div class="user">
                <h3>${user.name}</h3>
                <p>${user.email}</p>
                <p>${user.address.city}, ${user.address.country}</p>
                <small>Created: ${user.createdAt.toLocaleDateString()}</small>
            </div>
        `).join('')
    }
}
```

---

## Best Practices

### Do

- Use JSON tags to control field names
- Add comments — they become JSDoc
- Use `time.Time` — it converts to `Date`
- Validate on Go side, don't trust frontend
- Keep models simple — data containers only
- Use pointers for optional fields (`*string` for nullable)

### Don't

- Don't add methods to Go structs used as models
- Don't use unexported fields — won't be bound
- Don't use complex interfaces
- Don't forget JSON tags — field names matter
- Don't nest too deeply

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Binding examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/binding)
