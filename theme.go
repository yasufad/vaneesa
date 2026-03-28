package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// ThemeService monitors system theme changes and emits events to the frontend.
type ThemeService struct {
	app *application.App
}

// NewThemeService creates a new theme service and registers for theme change events.
func NewThemeService(app *application.App) *ThemeService {
	s := &ThemeService{app: app}

	app.Event.OnApplicationEvent(events.Common.ThemeChanged, func(event *application.ApplicationEvent) {
		s.onThemeChanged()
	})

	return s
}

// onThemeChanged is called when the system theme changes.
// Emits a theme:changed event to the frontend with the current theme.
func (s *ThemeService) onThemeChanged() {
	theme := "light"
	if s.app.Env.IsDarkMode() {
		theme = "dark"
	}

	s.app.Event.Emit("theme:changed", theme)
}

// GetTheme returns the current system theme.
func (s *ThemeService) GetTheme() string {
	if s.app.Env.IsDarkMode() {
		return "dark"
	}
	return "light"
}
