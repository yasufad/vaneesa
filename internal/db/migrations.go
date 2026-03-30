package db

// migrations is an ordered slice of SQL statements applied exactly once each.
// A statement is NEVER modified after it has been applied to any environment.
// All schema changes must be appended as new entries at the end of this slice.
//
// The slice is 0-indexed but versions are 1-indexed (version = index + 1).
// The schema_version table is bootstrapped separately in db.go before this
// slice is consulted, so the first entry here is the first real data table.
var migrations = []string{

	// v1 — sessions: named, time-bounded capture records.
	`CREATE TABLE IF NOT EXISTS sessions (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT    NOT NULL,
		interface  TEXT    NOT NULL DEFAULT '',
		filter     TEXT    NOT NULL DEFAULT '',
		status     TEXT    NOT NULL DEFAULT 'active',
		started_at TEXT    NOT NULL DEFAULT (datetime('now')),
		ended_at   TEXT
	)`,

	// v2 — flows: one row per unique 5-tuple observed during a session.
	// Populated by the capture pipeline in Phase 4.
	`CREATE TABLE IF NOT EXISTS flows (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
		src_ip       TEXT    NOT NULL,
		dst_ip       TEXT    NOT NULL,
		src_port     INTEGER NOT NULL,
		dst_port     INTEGER NOT NULL,
		protocol     TEXT    NOT NULL,
		bytes_in     INTEGER NOT NULL DEFAULT 0,
		bytes_out    INTEGER NOT NULL DEFAULT 0,
		packets_in   INTEGER NOT NULL DEFAULT 0,
		packets_out  INTEGER NOT NULL DEFAULT 0,
		started_at   TEXT    NOT NULL,
		last_seen_at TEXT    NOT NULL,
		closed       INTEGER NOT NULL DEFAULT 0
	)`,

	// v3 — hosts: devices discovered passively from observed traffic.
	`CREATE TABLE IF NOT EXISTS hosts (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
		ip         TEXT    NOT NULL,
		mac        TEXT    NOT NULL DEFAULT '',
		vendor     TEXT    NOT NULL DEFAULT '',
		first_seen TEXT    NOT NULL,
		last_seen  TEXT    NOT NULL
	)`,

	// v4 — dns_queries: layer-7 DNS events extracted by the processor.
	`CREATE TABLE IF NOT EXISTS dns_queries (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
		client_ip  TEXT    NOT NULL,
		query      TEXT    NOT NULL,
		qtype      TEXT    NOT NULL,
		response   TEXT    NOT NULL DEFAULT '',
		ts         TEXT    NOT NULL
	)`,

	// v5 — alerts: anomaly detection events produced by the Detector stage.
	`CREATE TABLE IF NOT EXISTS alerts (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
		type         TEXT    NOT NULL,
		severity     TEXT    NOT NULL,
		src_ip       TEXT    NOT NULL DEFAULT '',
		dst_ip       TEXT    NOT NULL DEFAULT '',
		detail       TEXT    NOT NULL DEFAULT '',
		acknowledged INTEGER NOT NULL DEFAULT 0,
		ts           TEXT    NOT NULL DEFAULT (datetime('now'))
	)`,

	// v6 — snapshots: per-second traffic summaries for historical graph replay.
	// protocol_dist is a JSON object mapping protocol name → byte count.
	`CREATE TABLE IF NOT EXISTS snapshots (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
		ts            TEXT    NOT NULL,
		bytes_in      INTEGER NOT NULL DEFAULT 0,
		bytes_out     INTEGER NOT NULL DEFAULT 0,
		packets_in    INTEGER NOT NULL DEFAULT 0,
		packets_out   INTEGER NOT NULL DEFAULT 0,
		protocol_dist TEXT    NOT NULL DEFAULT '{}'
	)`,

	// v7 — settings: key-value store for all user configuration.
	// Default values are seeded in code (not migrations) to avoid
	// hard-coded data that would be awkward to change later.
	`CREATE TABLE IF NOT EXISTS settings (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL DEFAULT ''
	)`,

	// v8 — indices for the most common read patterns at query time.
	`CREATE INDEX IF NOT EXISTS idx_flows_session     ON flows(session_id)`,
	`CREATE INDEX IF NOT EXISTS idx_hosts_session     ON hosts(session_id)`,
	`CREATE INDEX IF NOT EXISTS idx_alerts_session    ON alerts(session_id)`,
	`CREATE INDEX IF NOT EXISTS idx_alerts_ack        ON alerts(acknowledged)`,
	`CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id)`,
	`CREATE INDEX IF NOT EXISTS idx_dns_session       ON dns_queries(session_id)`,
}
