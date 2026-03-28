# Advanced Binding

Advanced binding techniques including directives, code injection, and custom IDs.

This guide covers advanced techniques for customising and optimising the binding generation process in Wails v3.

---

## Customising Generated Code with Directives

### Injecting Custom Code

The `//wails:inject` directive injects custom JavaScript/TypeScript code into the generated bindings:

```go
//wails:inject console.log("Hello from Wails!");
type MyService struct{}

func (s *MyService) Greet(name string) string {
    return "Hello, " + name
}
```

You can also use conditional injection to target specific output formats:

```go
//wails:inject j*:console.log("Hello JS!");  // JavaScript only
//wails:inject t*:console.log("Hello TS!");  // TypeScript only
```

### Including Additional Files

The `//wails:include` directive includes additional files with the generated bindings:

```go
//wails:include js/*.js
package mypackage
```

Typically used in package documentation comments to include additional JavaScript/TypeScript files alongside the generated bindings.

### Marking Internal Types and Methods

The `//wails:internal` directive marks a type or method as internal, preventing it from being exported to the frontend:

```go
//wails:internal
type InternalModel struct {
    Field string
}

//wails:internal
func (s *MyService) InternalMethod() {}
```

Useful for types and methods that are only used internally by Go code and should not be exposed to the frontend.

### Ignoring Methods

The `//wails:ignore` directive completely ignores a method during binding generation:

```go
//wails:ignore
func (s *MyService) IgnoredMethod() {}
```

Similar to `//wails:internal`, but completely skips the method rather than marking it as internal.

### Custom Method IDs

The `//wails:id` directive specifies a custom ID for a method, overriding the default hash-based ID:

```go
//wails:id 42
func (s *MyService) CustomIDMethod() {}
```

Useful for maintaining compatibility when refactoring code.

---

## Working with Complex Types

### Nested Structs

The binding generator handles nested structs automatically:

```go
type Address struct {
    Street string
    City   string
    State  string
    Zip    string
}

type Person struct {
    Name    string
    Address Address
}
```

The generated JavaScript/TypeScript code will include classes for both `Person` and `Address`.

### Maps and Slices

Maps and slices are handled automatically:

```go
type Person struct {
    Name       string
    Attributes map[string]string
    Friends    []string
}
```

In JavaScript, maps are represented as objects and slices as arrays. In TypeScript, maps are `Record<K, V>` and slices are `T[]`.

### Generic Types

The binding generator supports generic types:

```go
type Result[T any] struct {
    Data  T
    Error string
}

func (s *MyService) GetResult() Result[string] {
    return Result[string]{Data: "Hello, World!", Error: ""}
}
```

Generated TypeScript:

```typescript
export class Result<T> {
    "Data": T;
    "Error": string;

    constructor(source: Partial<Result<T>> = {}) {
        if (!("Data" in source)) { this["Data"] = null as any; }
        if (!("Error" in source)) { this["Error"] = ""; }
        Object.assign(this, source);
    }

    static createFrom<T>(source: string | object = {}): Result<T> {
        let parsedSource = typeof source === "string" ? JSON.parse(source) : source;
        return new Result<T>(parsedSource as Partial<Result<T>>);
    }
}
```

### Interfaces

Generate TypeScript interfaces instead of classes using the `-i` flag:

```bash
wails3 generate bindings -ts -i
```

Generated TypeScript interfaces:

```typescript
export interface Person {
    Name: string;
    Attributes: Record<string, string>;
    Friends: string[];
}
```

---

## Optimising Binding Generation

### Using Names Instead of IDs

By default, the binding generator uses hash-based IDs for method calls. Use `-names` to switch to name-based calls:

```bash
wails3 generate bindings -names
```

Generated code:

```javascript
export function Greet(name) {
    let $resultPromise = $Call.ByName("Greet", name);
    return $resultPromise;
}
```

This makes generated code more readable and easier to debug, at a slight efficiency cost.

### Bundling the Runtime

Use `-b` to bundle the Wails runtime directly with the generated code rather than importing from the `@wailsio/runtime` npm package:

```bash
wails3 generate bindings -b
```

### Disabling Index Files

Use `-noindex` to skip generating index files:

```bash
wails3 generate bindings -noindex
```

Useful if you prefer to import services and models directly from their respective files.

---

## Real-World Examples

### Authentication Service

```go
package auth

//wails:inject console.log("Auth service initialized");
type AuthService struct {
    users map[string]User
}

type User struct {
    Username string
    Email    string
    Role     string
}

type LoginRequest struct {
    Username string
    Password string
}

type LoginResponse struct {
    Success bool
    User    User
    Token   string
    Error   string
}

func (s *AuthService) Login(req LoginRequest) LoginResponse {
    // Implementation...
}

func (s *AuthService) GetCurrentUser() User {
    // Implementation...
}

// Internal helper method
//wails:internal
func (s *AuthService) validateCredentials(username, password string) bool {
    // Implementation...
}
```

### Data Processing Service with Generics

```go
package data

type ProcessingResult[T any] struct {
    Data  T
    Error string
}

type DataService struct{}

func (s *DataService) Process(data string) ProcessingResult[map[string]int] {
    // Implementation...
}

func (s *DataService) ProcessBatch(data []string) ProcessingResult[[]map[string]int] {
    // Implementation...
}

//wails:internal
func (s *DataService) parseData(data string) (map[string]int, error) {
    // Implementation...
}
```

### Conditional Code Injection

```go
//wails:inject j*:/**
//wails:inject j*: * @param {string} arg
//wails:inject j*: * @returns {Promise<void>}
//wails:inject j*: */
//wails:inject j*:export async function CustomMethod(arg) {
//wails:inject t*:export async function CustomMethod(arg: string): Promise<void> {
//wails:inject     await InternalMethod("Hello " + arg + "!");
//wails:inject }
type Service struct{}
```

This injects different code for JavaScript and TypeScript outputs, providing appropriate type annotations for each language.

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Binding examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/binding)
