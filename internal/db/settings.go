package db

import (
	"database/sql"
	"fmt"
	"strconv"
)

// settingGet reads a single value from the key-value settings table.
// Returns the raw string or an error if the key is absent.
func (db *DB) settingGet(key string) (string, error) {
	var value string
	err := db.conn.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("setting %q not found", key)
	}
	return value, err
}

// settingSet upserts a key-value pair into the settings table.
func (db *DB) settingSet(key, value string) error {
	_, err := db.conn.Exec(
		"INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		key, value,
	)
	return err
}

// GetSettings reads all user-configurable capture preferences from the database.
func (db *DB) GetSettings() (*Settings, error) {
	iface, err := db.settingGet("defaultInterface")
	if err != nil {
		return nil, fmt.Errorf("reading defaultInterface: %w", err)
	}

	promsicRaw, err := db.settingGet("promiscuousMode")
	if err != nil {
		return nil, fmt.Errorf("reading promiscuousMode: %w", err)
	}
	promiscuous, err := strconv.ParseBool(promsicRaw)
	if err != nil {
		// Treat a corrupt value as false rather than surfacing a cryptic error.
		promiscuous = false
	}

	filter, err := db.settingGet("bpfFilter")
	if err != nil {
		return nil, fmt.Errorf("reading bpfFilter: %w", err)
	}

	return &Settings{
		DefaultInterface: iface,
		PromiscuousMode:  promiscuous,
		BPFFilter:        filter,
	}, nil
}

// SaveSettings persists all capture preference fields to the database.
func (db *DB) SaveSettings(s Settings) error {
	pairs := [][2]string{
		{"defaultInterface", s.DefaultInterface},
		{"promiscuousMode", strconv.FormatBool(s.PromiscuousMode)},
		{"bpfFilter", s.BPFFilter},
	}
	for _, p := range pairs {
		if err := db.settingSet(p[0], p[1]); err != nil {
			return fmt.Errorf("saving %q: %w", p[0], err)
		}
	}
	return nil
}

// GetDetectorThresholds reads all anomaly detector threshold values.
func (db *DB) GetDetectorThresholds() (*DetectorThresholds, error) {
	readInt := func(key string) (int, error) {
		raw, err := db.settingGet(key)
		if err != nil {
			return 0, err
		}
		v, err := strconv.Atoi(raw)
		if err != nil {
			return 0, fmt.Errorf("parsing %q as int: %w", key, err)
		}
		return v, nil
	}

	rateMul, err := readInt("rateSpikeMultiplier")
	if err != nil {
		return nil, err
	}
	ratePPS, err := readInt("rateSpikeMinimumPPS")
	if err != nil {
		return nil, err
	}
	portScan, err := readInt("portScanThreshold")
	if err != nil {
		return nil, err
	}
	synRatio, err := readInt("synFloodRatio")
	if err != nil {
		return nil, err
	}
	synMinSYNs, err := readInt("synFloodMinimumSYNs")
	if err != nil {
		return nil, err
	}

	return &DetectorThresholds{
		RateSpikeMultiplier: rateMul,
		RateSpikeMinimumPPS: ratePPS,
		PortScanThreshold:   portScan,
		SYNFloodRatio:       synRatio,
		SYNFloodMinimumSYNs: synMinSYNs,
	}, nil
}

// SaveDetectorThresholds persists all anomaly detector threshold values.
func (db *DB) SaveDetectorThresholds(t DetectorThresholds) error {
	pairs := [][2]string{
		{"rateSpikeMultiplier", strconv.Itoa(t.RateSpikeMultiplier)},
		{"rateSpikeMinimumPPS", strconv.Itoa(t.RateSpikeMinimumPPS)},
		{"portScanThreshold", strconv.Itoa(t.PortScanThreshold)},
		{"synFloodRatio", strconv.Itoa(t.SYNFloodRatio)},
		{"synFloodMinimumSYNs", strconv.Itoa(t.SYNFloodMinimumSYNs)},
	}
	for _, p := range pairs {
		if err := db.settingSet(p[0], p[1]); err != nil {
			return fmt.Errorf("saving %q: %w", p[0], err)
		}
	}
	return nil
}
