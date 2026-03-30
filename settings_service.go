package main

import (
	"github.com/yasufad/vaneesa/internal/db"
	"github.com/yasufad/vaneesa/internal/types"
)

// SettingsService exposes capture settings and detector threshold management
// to the frontend. All reads and writes are backed by SQLite.
type SettingsService struct {
	database *db.DB
}

// NewSettingsService creates a SettingsService backed by the provided database.
func NewSettingsService(database *db.DB) *SettingsService {
	return &SettingsService{database: database}
}

// GetSettings returns the current user-configured capture preferences.
func (s *SettingsService) GetSettings() (*types.Settings, error) {
	return s.database.GetSettings()
}

// SaveSettings persists updated capture preferences to the database.
func (s *SettingsService) SaveSettings(settings types.Settings) error {
	return s.database.SaveSettings(&settings)
}

// GetDetectorThresholds returns the current anomaly detection threshold values.
func (s *SettingsService) GetDetectorThresholds() (*types.DetectorThresholds, error) {
	settings, err := s.database.GetSettings()
	if err != nil {
		return nil, err
	}
	return &settings.Thresholds, nil
}

// SaveDetectorThresholds persists updated anomaly detection thresholds to the database.
func (s *SettingsService) SaveDetectorThresholds(thresholds types.DetectorThresholds) error {
	settings, err := s.database.GetSettings()
	if err != nil {
		return err
	}
	settings.Thresholds = thresholds
	return s.database.SaveSettings(settings)
}
