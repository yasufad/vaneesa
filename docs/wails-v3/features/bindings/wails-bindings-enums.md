# Enums

Automatic enum generation from Go constants.

The Wails v3 binding generator **automatically detects Go constant types and generates TypeScript enums or JavaScript const objects**. No registration, no configuration — just define your types and constants in Go, and the generator handles the rest.

> Unlike Wails v2, there is **no need to call `EnumBind`** or register enums manually. The generator discovers them automatically from your source code.

---

## Quick Start

**Define a named type with constants in Go:**

```go
type Status string

const (
    StatusActive  Status = "active"
    StatusPending Status = "pending"
    StatusClosed  Status = "closed"
)
```

**Use the type in a struct or service method:**

```go
type Ticket struct {
    ID     int    `json:"id"`
    Title  string `json:"title"`
    Status Status `json:"status"`
}
```

**Generate bindings:**

```bash
wails3 generate bindings
```

The generator output reports enum counts alongside models:

```
3 Enums, 5 Models
```

**Use in your frontend:**

```javascript
import { Ticket, Status } from './bindings/myapp/models'

const ticket = new Ticket({
    id: 1,
    title: "Bug report",
    status: Status.StatusActive
})
```

---

## Defining Enums

An enum in Wails is a **named type** with an underlying basic type, combined with **const declarations** of that type.

### String Enums

```go
// Title is a title
type Title string

const (
    // Mister is a title
    Mister Title = "Mr"
    Miss   Title = "Miss"
    Ms     Title = "Ms"
    Mrs    Title = "Mrs"
    Dr     Title = "Dr"
)
```

Generated TypeScript:

```typescript
/**
 * Title is a title
 */
export enum Title {
    /** The Go zero value for the underlying type of the enum. */
    $zero = "",

    /** Mister is a title */
    Mister = "Mr",
    Miss = "Miss",
    Ms = "Ms",
    Mrs = "Mrs",
    Dr = "Dr",
}
```

Generated JavaScript:

```javascript
/**
 * Title is a title
 * @readonly
 * @enum {string}
 */
export const Title = {
    $zero: "",
    Mister: "Mr",
    Miss: "Miss",
    Ms: "Ms",
    Mrs: "Mrs",
    Dr: "Dr",
};
```

### Integer Enums

```go
type Priority int

const (
    PriorityLow    Priority = 0
    PriorityMedium Priority = 1
    PriorityHigh   Priority = 2
)
```

Generated TypeScript:

```typescript
export enum Priority {
    $zero = 0,
    PriorityLow = 0,
    PriorityMedium = 1,
    PriorityHigh = 2,
}
```

### Type Alias Enums

Go type aliases (`=`) generate a type definition plus a const object, rather than a native TypeScript `enum`:

```go
// Age is an integer with some predefined values
type Age = int

const (
    NewBorn    Age = 0
    Teenager   Age = 12
    YoungAdult Age = 18
    MiddleAged Age = 50  // Oh no, some grey hair!
    Mathusalem Age = 1000
)
```

Generated TypeScript:

```typescript
export type Age = number;

export const Age = {
    NewBorn: 0,
    Teenager: 12,
    YoungAdult: 18,
    MiddleAged: 50,   // Oh no, some grey hair!
    Mathusalem: 1000,
};
```

> **Named types** (`type Title string`) → native TypeScript `enum` with a `$zero` member.
> **Type aliases** (`type Age = int`) → `type` + `const` namespace pair, no `$zero`.

---

## The `$zero` Value

Every named-type enum includes a `$zero` member representing the **Go zero value** for the underlying type:

| Underlying Type | `$zero` Value |
|---|---|
| `string` | `""` |
| `int`, `int8`, `int16`, `int32`, `int64` | `0` |
| `uint`, `uint8`, `uint16`, `uint32`, `uint64` | `0` |
| `float32`, `float64` | `0` |
| `bool` | `false` |

When a struct field uses an enum type and no value is provided, the constructor defaults to `$zero`:

```typescript
export class Person {
    "Title": Title;

    constructor($$source: Partial<Person> = {}) {
        if (!("Title" in $$source)) {
            this["Title"] = Title.$zero;  // defaults to ""
        }
        Object.assign(this, $$source);
    }
}
```

This ensures enum fields are never `undefined`. When generating TypeScript interfaces (using `-i`), there is no constructor and fields may be absent as usual.

---

## Using Enums in Structs

When a struct field has an enum type, the generated code preserves that type rather than falling back to the primitive:

```go
type Person struct {
    Title Title
    Name  string
    Age   Age
}
```

Generated TypeScript:

```typescript
export class Person {
    "Title": Title;
    "Name": string;
    "Age": Age;

    constructor($$source: Partial<Person> = {}) {
        if (!("Title" in $$source)) { this["Title"] = Title.$zero; }
        if (!("Name" in $$source))  { this["Name"] = ""; }
        if (!("Age" in $$source))   { this["Age"] = 0; }
        Object.assign(this, $$source);
    }
}
```

The `Title` field is typed as `Title`, not `string` — giving your IDE full autocompletion and type checking.

---

## Enums from Imported Packages

Enums defined in separate packages are fully supported and generated into the corresponding package directory:

```go
// services/types.go
package services

type Title string

const (
    Mister Title = "Mr"
    Miss   Title = "Miss"
    Ms     Title = "Ms"
)
```

```go
// main.go
func (*GreetService) Greet(name string, title services.Title) string {
    return "Hello " + string(title) + " " + name
}
```

Generated in the `services` models file, with import paths resolved automatically:

```typescript
// bindings/myapp/services/models.ts
export enum Title {
    $zero = "",
    Mister = "Mr",
    Miss = "Miss",
    Ms = "Ms",
}
```

---

## Comments and Documentation

The generator preserves Go comments as JSDoc in the generated output. Type comments become the enum's doc comment, individual const comments become member doc comments, and inline comments are preserved where possible. Your IDE will show documentation for enum values on hover.

---

## Supported Underlying Types

| Go Type | Works as Enum |
|---|:---:|
| `string` | Yes |
| `int`, `int8`, `int16`, `int32`, `int64` | Yes |
| `uint`, `uint8`, `uint16`, `uint32`, `uint64` | Yes |
| `float32`, `float64` | Yes |
| `byte` (`uint8`) | Yes |
| `rune` (`int32`) | Yes |
| `bool` | Yes |
| `complex64`, `complex128` | No |

---

## Limitations

The following are **not** supported for enum generation:

- **Generic types** — type parameters prevent constant detection
- **Types with custom `json.Marshaler` or `encoding.TextMarshaler`** — the generator skips these as custom serialisation may not match generated values
- **Constants that cannot be statically evaluated** — values must be known and representable; standard `iota` patterns work fine
- **Complex number types** — `complex64` and `complex128` are not supported

---

## Complete Example

**Go:**

```go
package main

import "github.com/wailsapp/wails/v3/pkg/application"

// BackgroundType defines the type of background
type BackgroundType string

const (
    BackgroundSolid    BackgroundType = "solid"
    BackgroundGradient BackgroundType = "gradient"
    BackgroundImage    BackgroundType = "image"
)

type BackgroundConfig struct {
    Type  BackgroundType `json:"type"`
    Value string         `json:"value"`
}

type ThemeService struct{}

func (*ThemeService) GetBackground() BackgroundConfig {
    return BackgroundConfig{Type: BackgroundSolid, Value: "#ffffff"}
}

func (*ThemeService) SetBackground(config BackgroundConfig) error {
    return nil
}

func main() {
    app := application.New(application.Options{
        Services: []application.Service{
            application.NewService(&ThemeService{}),
        },
    })
    app.Window.New()
    app.Run()
}
```

**Frontend (TypeScript):**

```typescript
import { GetBackground, SetBackground } from './bindings/myapp/themeservice'
import { BackgroundConfig, BackgroundType } from './bindings/myapp/models'

const bg = await GetBackground()

if (bg.type === BackgroundType.BackgroundSolid) {
    console.log("Solid background:", bg.value)
}

await SetBackground(new BackgroundConfig({
    type: BackgroundType.BackgroundGradient,
    value: "linear-gradient(to right, #000, #fff)"
}))
```

**Frontend (JavaScript):**

```javascript
import { GetBackground, SetBackground } from './bindings/myapp/themeservice'
import { BackgroundConfig, BackgroundType } from './bindings/myapp/models'

const bg = await GetBackground()

switch (bg.type) {
    case BackgroundType.BackgroundSolid:
        applySolid(bg.value)
        break
    case BackgroundType.BackgroundGradient:
        applyGradient(bg.value)
        break
    case BackgroundType.BackgroundImage:
        applyImage(bg.value)
        break
}
```

---

**Resources:** [Discord](https://discord.gg/JDdSxwjhGf) · [Binding examples](https://github.com/wailsapp/wails/tree/v3-alpha/v3/examples/binding)
