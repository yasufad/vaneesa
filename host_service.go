package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yasufad/vaneesa/internal/db"
	"github.com/yasufad/vaneesa/internal/types"
)

// HostService exposes host query methods to the frontend for the Hosts view.
type HostService struct {
	app      *application.App
	database *db.DB
}

// NewHostService creates a HostService bound to the application database.
func NewHostService(app *application.App, database *db.DB) *HostService {
	return &HostService{
		app:      app,
		database: database,
	}
}

// GetAllHosts returns all discovered hosts for the given session, ordered by
// total traffic descending.
func (s *HostService) GetAllHosts(sessionID int64) ([]types.HostRecord, error) {
	return s.database.GetAllHosts(sessionID)
}
