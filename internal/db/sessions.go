package db

import (
	"database/sql"
	"fmt"
	"time"
)

// ListSessions returns all sessions ordered by most recently started.
func (db *DB) ListSessions() ([]SessionSummary, error) {
	const q = `
		SELECT
			id,
			name,
			status,
			started_at,
			ended_at,
			CASE
				WHEN ended_at IS NOT NULL
					THEN CAST((julianday(ended_at) - julianday(started_at)) * 86400 AS INTEGER)
				ELSE 0
			END AS duration_seconds
		FROM sessions
		ORDER BY started_at DESC`

	rows, err := db.conn.Query(q)
	if err != nil {
		return nil, fmt.Errorf("querying sessions: %w", err)
	}
	defer rows.Close()

	var result []SessionSummary
	for rows.Next() {
		var s SessionSummary
		var startedRaw, endedRaw sql.NullString

		if err := rows.Scan(&s.ID, &s.Name, &s.Status, &startedRaw, &endedRaw, &s.DurationSeconds); err != nil {
			return nil, fmt.Errorf("scanning session row: %w", err)
		}

		if startedRaw.Valid {
			t, err := time.Parse("2006-01-02T15:04:05Z", startedRaw.String)
			if err == nil {
				s.StartedAt = t
			}
		}
		if endedRaw.Valid {
			t, err := time.Parse("2006-01-02T15:04:05Z", endedRaw.String)
			if err == nil {
				s.EndedAt = &t
			}
		}

		result = append(result, s)
	}

	return result, rows.Err()
}

// GetSession returns the full session record for the given ID.
func (db *DB) GetSession(id int64) (*Session, error) {
	const q = `SELECT id, name, interface, filter, status, started_at, ended_at
		          FROM sessions WHERE id = ?`

	var s Session
	var startedRaw, endedRaw sql.NullString

	err := db.conn.QueryRow(q, id).Scan(
		&s.ID, &s.Name, &s.Interface, &s.Filter, &s.Status, &startedRaw, &endedRaw,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session %d not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("querying session %d: %w", id, err)
	}

	if startedRaw.Valid {
		t, err := time.Parse("2006-01-02T15:04:05Z", startedRaw.String)
		if err == nil {
			s.StartedAt = t
		}
	}
	if endedRaw.Valid {
		t, err := time.Parse("2006-01-02T15:04:05Z", endedRaw.String)
		if err == nil {
			s.EndedAt = &t
		}
	}

	return &s, nil
}

// StartSession inserts a new active session record and returns its ID.
// The caller is responsible for subsequently calling EndSession when capture stops.
func (db *DB) StartSession(name, iface, filter string) (int64, error) {
	const q = `INSERT INTO sessions(name, interface, filter, status, started_at)
		          VALUES(?, ?, ?, 'active', datetime('now'))`

	res, err := db.conn.Exec(q, name, iface, filter)
	if err != nil {
		return 0, fmt.Errorf("inserting session: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("retrieving inserted session id: %w", err)
	}

	return id, nil
}

// EndSession marks the session as ended and stamps the ended_at timestamp.
func (db *DB) EndSession(id int64) error {
	const q = `UPDATE sessions SET status = 'ended', ended_at = datetime('now')
		          WHERE id = ? AND status = 'active'`

	res, err := db.conn.Exec(q, id)
	if err != nil {
		return fmt.Errorf("ending session %d: %w", id, err)
	}

	n, _ := res.RowsAffected()
	if n == 0 {
		// Either the session does not exist or was already ended; both are acceptable.
		return nil
	}

	return nil
}

// DeleteSession removes a session and all associated rows. ON DELETE CASCADE on
// every child table means one DELETE statement cleans up the entire session.
func (db *DB) DeleteSession(id int64) error {
	if _, err := db.conn.Exec("DELETE FROM sessions WHERE id = ?", id); err != nil {
		return fmt.Errorf("deleting session %d: %w", id, err)
	}
	return nil
}
