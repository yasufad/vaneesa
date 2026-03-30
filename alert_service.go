package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yasufad/vaneesa/internal/db"
	"github.com/yasufad/vaneesa/internal/types"
)

// AlertService exposes alert query and acknowledgement methods to the frontend.
type AlertService struct {
	app      *application.App
	database *db.DB
}

// NewAlertService creates an AlertService bound to the application database.
func NewAlertService(app *application.App, database *db.DB) *AlertService {
	return &AlertService{
		app:      app,
		database: database,
	}
}

// GetPagedAlerts returns a page of alerts for the given session, newest first.
func (s *AlertService) GetPagedAlerts(sessionID int64, page, pageSize int) (*types.PagedAlerts, error) {
	return s.database.GetPagedAlerts(sessionID, page, pageSize)
}

// AcknowledgeAlert marks an alert as acknowledged.
func (s *AlertService) AcknowledgeAlert(id int64) error {
	return s.database.AcknowledgeAlert(id)
}

// GetUnacknowledgedCount returns the number of unread alerts for a session.
func (s *AlertService) GetUnacknowledgedCount(sessionID int64) (int, error) {
	return s.database.GetUnacknowledgedCount(sessionID)
}
