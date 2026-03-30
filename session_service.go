package main

import (
	"time"

	"github.com/yasufad/vaneesa/internal/db"
	"github.com/yasufad/vaneesa/internal/types"
)

// SessionService exposes session lifecycle management to the frontend
// The capture pipeline will call StartSession / EndSession
// directly on the database; this service is the frontend's read/write path.
type SessionService struct {
	database *db.DB
}

// NewSessionService creates a SessionService backed by the provided database.
func NewSessionService(database *db.DB) *SessionService {
	return &SessionService{database: database}
}

// ListSessions returns all sessions ordered by most recently started.
func (s *SessionService) ListSessions() ([]types.SessionSummary, error) {
	return s.database.ListSessions()
}

// GetSession returns the full session record for the given ID.
func (s *SessionService) GetSession(id int64) (*types.Session, error) {
	return s.database.GetSession(id)
}

// StartSession creates a new active session with the given name and returns its ID.
func (s *SessionService) StartSession(name string) (int64, error) {
	session := &types.Session{
		Name:      name,
		Mode:      types.CaptureLive,
		StartedAt: time.Now(),
	}
	return s.database.InsertSession(session)
}

// EndSession marks the session as ended.
func (s *SessionService) EndSession(id int64) error {
	return s.database.EndSession(id, time.Now())
}

// DeleteSession permanently removes a session and all associated flow, host,
// alert, snapshot, and DNS records via ON DELETE CASCADE.
func (s *SessionService) DeleteSession(id int64) error {
	return s.database.DeleteSession(id)
}
