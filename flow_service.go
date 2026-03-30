package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yasufad/vaneesa/internal/db"
	"github.com/yasufad/vaneesa/internal/types"
)

// FlowService exposes flow query methods to the frontend for the Connections
// view. It provides paginated access to flow records with filtering and sorting.
type FlowService struct {
	app      *application.App
	database *db.DB
}

// NewFlowService creates a FlowService bound to the application database.
func NewFlowService(app *application.App, database *db.DB) *FlowService {
	return &FlowService{
		app:      app,
		database: database,
	}
}

// GetPagedFlows returns a page of flows for the given session, ordered by
// total bytes descending (heaviest talkers first).
func (s *FlowService) GetPagedFlows(sessionID int64, page, pageSize int) (*types.PagedFlows, error) {
	return s.database.GetPagedFlows(sessionID, page, pageSize)
}
