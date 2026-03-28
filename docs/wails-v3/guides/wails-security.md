# Security Best Practices

Secure your Wails application.

## Overview

Security is critical for desktop applications. Follow these practices to keep your application secure.

## Input Validation

### Always Validate

```go
func (s *UserService) CreateUser(email, password string) (*User, error) {
    // Validate email
    if !isValidEmail(email) {
        return nil, errors.New("invalid email")
    }

    // Validate password strength
    if len(password) < 8 {
        return nil, errors.New("password too short")
    }

    // Sanitise input
    email = strings.TrimSpace(email)
    email = html.EscapeString(email)

    // Continue...
}
```

### Sanitise HTML

```go
import "html"

func (s *Service) SaveComment(text string) error {
    // Escape HTML
    text = html.EscapeString(text)

    // Validate length
    if len(text) > 1000 {
        return errors.New("comment too long")
    }

    return s.db.Save(text)
}
```

## Authentication

### Secure Password Storage

```go
import "golang.org/x/crypto/bcrypt"

func hashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(hash), err
}

func verifyPassword(hash, password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### Session Management

```go
type Session struct {
    UserID    int
    Token     string
    ExpiresAt time.Time
}

func (a *AuthService) CreateSession(userID int) (*Session, error) {
    token := generateSecureToken()

    session := &Session{
        UserID:    userID,
        Token:     token,
        ExpiresAt: time.Now().Add(24 * time.Hour),
    }

    return session, a.saveSession(session)
}
```

## Data Protection

### Encrypt Sensitive Data

```go
import "crypto/aes"
import "crypto/cipher"

func encrypt(data []byte, key []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    nonce := make([]byte, gcm.NonceSize())
    return gcm.Seal(nonce, nonce, data, nil), nil
}
```

### Secure Storage

```go
// Use OS keychain for sensitive data
import "github.com/zalando/go-keyring"

func saveAPIKey(key string) error {
    return keyring.Set("myapp", "api_key", key)
}

func getAPIKey() (string, error) {
    return keyring.Get("myapp", "api_key")
}
```

## Network Security

### Use HTTPS

```go
func makeAPICall(url string) (*Response, error) {
    // Always use HTTPS
    if !strings.HasPrefix(url, "https://") {
        return nil, errors.New("only HTTPS allowed")
    }

    return http.Get(url)
}
```

### Verify Certificates

```go
// Use proper certificate verification
client := &http.Client{
    Transport: &http.Transport{
        TLSClientConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    },
}
```

## Best Practices

### Do

- Validate all user input
- Sanitise data before storage
- Use secure password hashing
- Encrypt sensitive data
- Use HTTPS for network calls
- Store secrets securely
- Keep dependencies updated

### Don't

- Don't trust frontend input
- Don't store passwords in plain text
- Don't use HTTP for sensitive data
- Don't hardcode secrets
- Don't ignore security updates
