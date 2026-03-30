package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite" // registers the "sqlite" driver with database/sql
)

// DB wraps *sql.DB with Vaneesa-specific query methods.
// All exported methods are safe for concurrent use; the SQLite WAL journal mode
// permits concurrent reads alongside the single serialised write connection.
type DB struct {
	conn *sql.DB
}

// Open opens (or creates) the Vaneesa SQLite database at path, applies all
// pending schema migrations, and seeds default values on a fresh database.
func Open(path string) (*DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("creating database directory: %w", err)
	}

	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	// SQLite handles concurrent reads well but serialises writes. Capping to one
	// open connection eliminates the need for a separate write mutex on our side.
	conn.SetMaxOpenConns(1)

	// Apply pragmas that must be set per-connection rather than persisted to disk.
	// WAL mode improves read concurrency; foreign_keys enforces referential integrity;
	// busy_timeout prevents immediate SQLITE_BUSY errors during brief write contention.
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	}
	for _, p := range pragmas {
		if _, err := conn.Exec(p); err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("applying %q: %w", p, err)
		}
	}

	db := &DB{conn: conn}

	if err := db.runMigrations(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	if err := db.seedDefaults(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("seeding defaults: %w", err)
	}

	return db, nil
}

// Close releases the underlying database connection.
func (db *DB) Close() error {
	return db.conn.Close()
}

// runMigrations creates the schema_version tracking table (idempotent), then
// applies every migration that has not yet been recorded. Each migration runs
// inside its own transaction so a partial failure cannot corrupt the schema.
func (db *DB) runMigrations() error {
	const bootstrap = `
		CREATE TABLE IF NOT EXISTS schema_version (
			version    INTEGER PRIMARY KEY,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`

	if _, err := db.conn.Exec(bootstrap); err != nil {
		return fmt.Errorf("bootstrapping schema_version: %w", err)
	}

	var applied int
	row := db.conn.QueryRow("SELECT COALESCE(MAX(version), 0) FROM schema_version")
	if err := row.Scan(&applied); err != nil {
		return fmt.Errorf("reading current schema version: %w", err)
	}

	for i := applied; i < len(migrations); i++ {
		version := i + 1
		tx, err := db.conn.Begin()
		if err != nil {
			return fmt.Errorf("beginning transaction for migration %d: %w", version, err)
		}

		if _, err := tx.Exec(migrations[i]); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("executing migration %d: %w", version, err)
		}

		if _, err := tx.Exec(
			"INSERT INTO schema_version(version) VALUES(?)", version,
		); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("recording migration %d: %w", version, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("committing migration %d: %w", version, err)
		}
	}

	return nil
}

// seedDefaults ensures every settings key has at least its default value.
// INSERT OR IGNORE means existing user-configured values are never overwritten.
func (db *DB) seedDefaults() error {
	defaults := map[string]string{
		"defaultInterface":    "",
		"promiscuousMode":     "false",
		"bpfFilter":           "",
		"rateSpikeMultiplier": "5",
		"rateSpikeMinimumPPS": "10",
		"portScanThreshold":   "20",
		"synFloodRatio":       "10",
		"synFloodMinimumSYNs": "50",
	}

	for key, value := range defaults {
		if _, err := db.conn.Exec(
			"INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)", key, value,
		); err != nil {
			return fmt.Errorf("seeding default for %q: %w", key, err)
		}
	}

	return nil
}
