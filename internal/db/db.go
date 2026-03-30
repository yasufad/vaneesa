// Package db implements the SQLite persistence layer for Vaneesa.
// It uses modernc.org/sqlite - a pure Go driver with no CGo dependency -
// to keep cross-platform builds simple.
//
// All schema changes are applied via the sequential migration runner in this
// file. No ORM is used; every query is plain SQL with database/sql.
//
// Database location follows OS conventions:
//
//	Linux:   ~/.local/share/vaneesa/vaneesa.db
//	macOS:   ~/Library/Application Support/vaneesa/vaneesa.db
//	Windows: %APPDATA%\vaneesa\vaneesa.db
package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	// Import the pure-Go SQLite driver as a side effect.
	// The driver registers itself with database/sql under the "sqlite" name.
	_ "modernc.org/sqlite"
)

// DB wraps a *sql.DB with domain-specific query methods. All exported methods
// on DB are safe for concurrent use because they use separate statements and
// transactions rather than long-lived prepared statements that would require
// their own locking.
type DB struct {
	db *sql.DB
}

// Open creates or opens the Vaneesa database at the OS-appropriate path,
// runs any pending migrations, and returns a ready-to-use DB. The caller is
// responsible for calling Close when done.
func Open() (*DB, error) {
	path, err := dbPath()
	if err != nil {
		return nil, fmt.Errorf("storage: resolve db path: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return nil, fmt.Errorf("storage: create data dir: %w", err)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("storage: open sqlite at %q: %w", path, err)
	}

	// SQLite performs poorly with concurrent writers. A single writer is
	// enforced by setting max open connections to 1 and enabling WAL mode so
	// readers are never blocked by the writer.
	db.SetMaxOpenConns(1)

	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("storage: enable WAL: %w", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
		db.Close()
		return nil, fmt.Errorf("storage: enable foreign_keys: %w", err)
	}
	// Synchronous=NORMAL: safe in WAL mode and avoids fsync on every commit.
	// https://www.sqlite.org/pragma.html#pragma_synchronous
	if _, err := db.Exec("PRAGMA synchronous=NORMAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("storage: set synchronous: %w", err)
	}

	store := &DB{db: db}
	if err := store.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("storage: run migrations: %w", err)
	}

	return store, nil
}

// Close releases the database connection pool.
func (d *DB) Close() error {
	return d.db.Close()
}

// Raw returns the underlying *sql.DB for callers that need to start
// transactions directly. Use sparingly - prefer the domain methods on DB.
func (d *DB) Raw() *sql.DB {
	return d.db
}

//
// Schema migrations
//

// migration is a single, idempotent DDL statement applied in order.
// Each migration has a sequential integer ID. Once applied, it is recorded in
// the schema_migrations table and never applied again.
type migration struct {
	id  int
	sql string
}

// migrations lists every schema change in order. New changes MUST be appended;
// never edit or reorder existing entries.
var migrations = []migration{
	{
		id: 1,
		sql: `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id         INTEGER PRIMARY KEY,
			applied_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
		);`,
	},
	{
		id: 2,
		sql: `
		CREATE TABLE IF NOT EXISTS sessions (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			name        TEXT    NOT NULL,
			mode        TEXT    NOT NULL DEFAULT 'live',
			interface   TEXT    NOT NULL DEFAULT '',
			filter      TEXT    NOT NULL DEFAULT '',
			pcap_path   TEXT    NOT NULL DEFAULT '',
			promiscuous INTEGER NOT NULL DEFAULT 0,
			started_at  TEXT    NOT NULL,
			ended_at    TEXT
		);`,
	},
	{
		id: 3,
		sql: `
		CREATE TABLE IF NOT EXISTS flows (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			src_ip       TEXT    NOT NULL,
			dst_ip       TEXT    NOT NULL,
			src_port     INTEGER NOT NULL,
			dst_port     INTEGER NOT NULL,
			protocol     INTEGER NOT NULL,
			bytes_in     INTEGER NOT NULL DEFAULT 0,
			bytes_out    INTEGER NOT NULL DEFAULT 0,
			packets_in   INTEGER NOT NULL DEFAULT 0,
			packets_out  INTEGER NOT NULL DEFAULT 0,
			started_at   TEXT    NOT NULL,
			last_seen_at TEXT    NOT NULL,
			closed       INTEGER NOT NULL DEFAULT 0
		);
		CREATE INDEX IF NOT EXISTS idx_flows_session ON flows(session_id);
		CREATE INDEX IF NOT EXISTS idx_flows_src_ip  ON flows(session_id, src_ip);
		CREATE INDEX IF NOT EXISTS idx_flows_dst_ip  ON flows(session_id, dst_ip);`,
	},
	{
		id: 4,
		sql: `
		CREATE TABLE IF NOT EXISTS hosts (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			ip          TEXT    NOT NULL,
			mac         TEXT    NOT NULL DEFAULT '',
			vendor      TEXT    NOT NULL DEFAULT '',
			bytes_in    INTEGER NOT NULL DEFAULT 0,
			bytes_out   INTEGER NOT NULL DEFAULT 0,
			packets_in  INTEGER NOT NULL DEFAULT 0,
			packets_out INTEGER NOT NULL DEFAULT 0,
			first_seen  TEXT    NOT NULL,
			last_seen   TEXT    NOT NULL,
			UNIQUE(session_id, ip)
		);
		CREATE INDEX IF NOT EXISTS idx_hosts_session ON hosts(session_id);`,
	},
	{
		id: 5,
		sql: `
		CREATE TABLE IF NOT EXISTS dns_queries (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			client_ip   TEXT    NOT NULL,
			server_ip   TEXT    NOT NULL DEFAULT '',
			query       TEXT    NOT NULL,
			qtype       INTEGER NOT NULL,
			is_response INTEGER NOT NULL DEFAULT 0,
			response    TEXT    NOT NULL DEFAULT '',
			ts          TEXT    NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_dns_session ON dns_queries(session_id);
		CREATE INDEX IF NOT EXISTS idx_dns_query   ON dns_queries(session_id, query);`,
	},
	{
		id: 6,
		sql: `
		CREATE TABLE IF NOT EXISTS alerts (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			type         TEXT    NOT NULL,
			severity     TEXT    NOT NULL,
			src_ip       TEXT    NOT NULL DEFAULT '',
			dst_ip       TEXT    NOT NULL DEFAULT '',
			detail       TEXT    NOT NULL,
			acknowledged INTEGER NOT NULL DEFAULT 0,
			ts           TEXT    NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_alerts_session ON alerts(session_id);
		CREATE INDEX IF NOT EXISTS idx_alerts_unacked ON alerts(session_id, acknowledged);`,
	},
	{
		id: 7,
		sql: `
		CREATE TABLE IF NOT EXISTS snapshots (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			ts           TEXT    NOT NULL,
			bytes_in     INTEGER NOT NULL DEFAULT 0,
			bytes_out    INTEGER NOT NULL DEFAULT 0,
			packets_in   INTEGER NOT NULL DEFAULT 0,
			packets_out  INTEGER NOT NULL DEFAULT 0,
			protocol_dist TEXT   NOT NULL DEFAULT '{}'
		);
		CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id);`,
	},
	{
		id: 8,
		sql: `
		CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);`,
	},
	{
		id: 9,
		sql: `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_flows_unique_key 
		ON flows(session_id, src_ip, dst_ip, src_port, dst_port, protocol);`,
	},
}

// migrate applies any migrations that have not yet been recorded in
// schema_migrations. It runs each in its own transaction so a failure leaves
// the database in a consistent state (all migrations up to the failing one
// applied, the failing one cleanly rolled back).
func (d *DB) migrate() error {
	// Ensure the migrations table exists using a bare create statement outside
	// the loop because the loop depends on querying it.
	if _, err := d.db.Exec(migrations[0].sql); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, m := range migrations[1:] {
		applied, err := d.migrationApplied(m.id)
		if err != nil {
			return fmt.Errorf("check migration %d: %w", m.id, err)
		}
		if applied {
			continue
		}

		tx, err := d.db.Begin()
		if err != nil {
			return fmt.Errorf("migration %d: begin tx: %w", m.id, err)
		}

		if _, err := tx.Exec(m.sql); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %d: exec: %w", m.id, err)
		}
		if _, err := tx.Exec(
			`INSERT INTO schema_migrations(id) VALUES(?)`, m.id,
		); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %d: record: %w", m.id, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("migration %d: commit: %w", m.id, err)
		}
	}

	return nil
}

func (d *DB) migrationApplied(id int) (bool, error) {
	var n int
	err := d.db.QueryRow(
		`SELECT COUNT(*) FROM schema_migrations WHERE id = ?`, id,
	).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

//
// OS data directory resolution
//

func dbPath() (string, error) {
	dir, err := dataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "vaneesa.db"), nil
}

func dataDir() (string, error) {
	switch runtime.GOOS {
	case "windows":
		base := os.Getenv("APPDATA")
		if base == "" {
			return "", fmt.Errorf("APPDATA environment variable is not set")
		}
		return filepath.Join(base, "vaneesa"), nil

	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "vaneesa"), nil

	default: // Linux and other Unix-like systems
		// Follow XDG Base Directory Specification.
		// https://specifications.freedesktop.org/basedir-spec/latest/
		base := os.Getenv("XDG_DATA_HOME")
		if base == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			base = filepath.Join(home, ".local", "share")
		}
		return filepath.Join(base, "vaneesa"), nil
	}
}
