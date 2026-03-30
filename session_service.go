package main

import (
	"github.com/yasufad/vaneesa/internal/db"
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
func (s *SessionService) ListSessions() ([]db.SessionSummary, error) {
	return s.database.ListSessions()
}

// GetSession returns the full session record for the given ID.
func (s *SessionService) GetSession(id int64) (*db.Session, error) {
	return s.database.GetSession(id)
}

// StartSession creates a new active session with the given name and returns its ID.
// Interface and filter are empty until the capture pipeline is implemented in Phase 4.
func (s *SessionService) StartSession(name string) (int64, error) {
	return s.database.StartSession(name, "", "")
}

// EndSession marks the session as ended. Idempotent: calling it on an already-ended
// or non-existent session is a no-op rather than an error.
func (s *SessionService) EndSession(id int64) error {
	return s.database.EndSession(id)
}

// DeleteSession permanently removes a session and all associated flow, host,
// alert, snapshot, and DNS records via ON DELETE CASCADE.
func (s *SessionService) DeleteSession(id int64) error {
	return s.database.DeleteSession(id)
}
