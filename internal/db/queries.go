package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/yasufad/vaneesa/internal/types"
)

//
// Time encoding helpers
//

// SQLite stores times as RFC 3339 strings. These helpers centralise the
// conversion to prevent silent inconsistencies across query methods.

const timeLayout = time.RFC3339Nano

func encodeTime(t time.Time) string {
	return t.UTC().Format(timeLayout)
}

func decodeTime(s string) (time.Time, error) {
	return time.Parse(timeLayout, s)
}

func decodeTimePtr(s sql.NullString) (*time.Time, error) {
	if !s.Valid || s.String == "" {
		return nil, nil
	}
	t, err := decodeTime(s.String)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

//
// Sessions
//

// InsertSession creates a new session row and returns its database ID.
func (d *DB) InsertSession(s *types.Session) (int64, error) {
	res, err := d.db.Exec(`
		INSERT INTO sessions(name, mode, interface, filter, pcap_path, promiscuous, started_at)
		VALUES(?, ?, ?, ?, ?, ?, ?)`,
		s.Name,
		string(s.Mode),
		s.Interface,
		s.Filter,
		s.PCAPPath,
		boolToInt(s.Promiscuous),
		encodeTime(s.StartedAt),
	)
	if err != nil {
		return 0, fmt.Errorf("InsertSession: %w", err)
	}
	return res.LastInsertId()
}

// EndSession sets ended_at on an active session.
func (d *DB) EndSession(id int64, endedAt time.Time) error {
	_, err := d.db.Exec(
		`UPDATE sessions SET ended_at=? WHERE id=?`,
		encodeTime(endedAt), id,
	)
	if err != nil {
		return fmt.Errorf("EndSession(%d): %w", id, err)
	}
	return nil
}

// GetSession retrieves a single session by ID.
func (d *DB) GetSession(id int64) (*types.Session, error) {
	row := d.db.QueryRow(`
		SELECT id, name, mode, interface, filter, pcap_path, promiscuous, started_at, ended_at
		FROM sessions WHERE id=?`, id)

	return scanSession(row)
}

// ListSessions returns lightweight summaries of all sessions, newest first.
func (d *DB) ListSessions() ([]types.SessionSummary, error) {
	rows, err := d.db.Query(`
		SELECT
			s.id, s.name, s.mode, s.interface, s.started_at, s.ended_at,
			COUNT(DISTINCT f.id)  AS flow_count,
			COUNT(DISTINCT a.id)  AS alert_count,
			COALESCE(SUM(f.bytes_in + f.bytes_out), 0) AS total_bytes
		FROM sessions s
		LEFT JOIN flows  f ON f.session_id = s.id
		LEFT JOIN alerts a ON a.session_id = s.id
		GROUP BY s.id
		ORDER BY s.started_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("ListSessions: %w", err)
	}
	defer rows.Close()

	var summaries []types.SessionSummary
	for rows.Next() {
		var summ types.SessionSummary
		var startedStr string
		var endedStr sql.NullString
		var modeStr string

		if err := rows.Scan(
			&summ.ID, &summ.Name, &modeStr, &summ.Interface,
			&startedStr, &endedStr,
			&summ.FlowCount, &summ.AlertCount, &summ.TotalBytes,
		); err != nil {
			return nil, fmt.Errorf("ListSessions scan: %w", err)
		}

		summ.Mode = types.CaptureMode(modeStr)
		var err error
		summ.StartedAt, err = decodeTime(startedStr)
		if err != nil {
			return nil, fmt.Errorf("ListSessions decode started_at: %w", err)
		}
		summ.EndedAt, err = decodeTimePtr(endedStr)
		if err != nil {
			return nil, fmt.Errorf("ListSessions decode ended_at: %w", err)
		}

		summaries = append(summaries, summ)
	}
	return summaries, rows.Err()
}

// DeleteSession removes a session and all its associated rows via cascade.
func (d *DB) DeleteSession(id int64) error {
	_, err := d.db.Exec(`DELETE FROM sessions WHERE id=?`, id)
	if err != nil {
		return fmt.Errorf("DeleteSession(%d): %w", id, err)
	}
	return nil
}

func scanSession(row *sql.Row) (*types.Session, error) {
	var s types.Session
	var modeStr, startedStr string
	var endedStr sql.NullString
	var promic int

	if err := row.Scan(
		&s.ID, &s.Name, &modeStr, &s.Interface, &s.Filter, &s.PCAPPath,
		&promic, &startedStr, &endedStr,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scanSession: %w", err)
	}

	s.Mode = types.CaptureMode(modeStr)
	s.Promiscuous = promic != 0

	var err error
	s.StartedAt, err = decodeTime(startedStr)
	if err != nil {
		return nil, fmt.Errorf("scanSession decode started_at: %w", err)
	}
	s.EndedAt, err = decodeTimePtr(endedStr)
	if err != nil {
		return nil, fmt.Errorf("scanSession decode ended_at: %w", err)
	}

	return &s, nil
}

//
// Flows
//

// UpsertFlow inserts a new flow or updates counters on an existing one.
// It uses SQLite's INSERT ... ON CONFLICT DO UPDATE to handle the case
// where a flow was inserted in a previous call and is now accumulating more bytes.
func (d *DB) UpsertFlow(f *types.FlowRecord) (int64, error) {
	srcIP := ""
	if f.SrcIP != nil {
		srcIP = f.SrcIP.String()
	}
	dstIP := ""
	if f.DstIP != nil {
		dstIP = f.DstIP.String()
	}

	// Use UPSERT to insert or update based on the unique flow key
	res, err := d.db.Exec(`
		INSERT INTO flows(
			session_id, src_ip, dst_ip, src_port, dst_port, protocol,
			bytes_in, bytes_out, packets_in, packets_out,
			started_at, last_seen_at, closed
		) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
		ON CONFLICT(session_id, src_ip, dst_ip, src_port, dst_port, protocol)
		DO UPDATE SET
			bytes_in = excluded.bytes_in,
			bytes_out = excluded.bytes_out,
			packets_in = excluded.packets_in,
			packets_out = excluded.packets_out,
			last_seen_at = excluded.last_seen_at,
			closed = excluded.closed`,
		f.SessionID, srcIP, dstIP,
		f.SrcPort, f.DstPort, int(f.Protocol),
		f.BytesIn, f.BytesOut, f.PacketsIn, f.PacketsOut,
		encodeTime(f.StartedAt), encodeTime(f.LastSeenAt),
		boolToInt(f.Closed),
	)
	if err != nil {
		return 0, fmt.Errorf("UpsertFlow: %w", err)
	}
	return res.LastInsertId()
}

// GetPagedFlows returns a page of flows for a session ordered by total bytes
// descending (heaviest talkers first).
func (d *DB) GetPagedFlows(sessionID int64, page, pageSize int) (*types.PagedFlows, error) {
	if pageSize <= 0 || pageSize > 500 {
		pageSize = 500
	}
	offset := page * pageSize

	var total int64
	if err := d.db.QueryRow(
		`SELECT COUNT(*) FROM flows WHERE session_id=?`, sessionID,
	).Scan(&total); err != nil {
		return nil, fmt.Errorf("GetPagedFlows count: %w", err)
	}

	rows, err := d.db.Query(`
		SELECT id, session_id, src_ip, dst_ip, src_port, dst_port, protocol,
			bytes_in, bytes_out, packets_in, packets_out,
			started_at, last_seen_at, closed
		FROM flows
		WHERE session_id=?
		ORDER BY (bytes_in + bytes_out) DESC
		LIMIT ? OFFSET ?`,
		sessionID, pageSize, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("GetPagedFlows query: %w", err)
	}
	defer rows.Close()

	flows, err := scanFlows(rows)
	if err != nil {
		return nil, err
	}

	return &types.PagedFlows{
		Flows:      flows,
		TotalCount: total,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

// GetTopTalkers returns the n hosts with the highest total outbound byte count
// for the given session, suitable for the Dashboard top-talkers widget.
func (d *DB) GetTopTalkers(sessionID int64, n int) ([]types.HostSummary, error) {
	rows, err := d.db.Query(`
		SELECT src_ip,
			SUM(bytes_out) AS sent,
			SUM(bytes_in)  AS recv,
			COUNT(*)       AS flows
		FROM flows WHERE session_id=?
		GROUP BY src_ip
		ORDER BY sent DESC
		LIMIT ?`,
		sessionID, n,
	)
	if err != nil {
		return nil, fmt.Errorf("GetTopTalkers: %w", err)
	}
	defer rows.Close()

	return scanHostSummaries(rows)
}

// GetTopDestinations returns the n most-contacted destination IPs.
func (d *DB) GetTopDestinations(sessionID int64, n int) ([]types.DestinationSummary, error) {
	rows, err := d.db.Query(`
		SELECT dst_ip,
			SUM(bytes_in)  AS recv,
			SUM(bytes_out) AS sent,
			COUNT(*)       AS flows
		FROM flows WHERE session_id=?
		GROUP BY dst_ip
		ORDER BY recv DESC
		LIMIT ?`,
		sessionID, n,
	)
	if err != nil {
		return nil, fmt.Errorf("GetTopDestinations: %w", err)
	}
	defer rows.Close()

	var results []types.DestinationSummary
	for rows.Next() {
		var d types.DestinationSummary
		var ipStr string
		if err := rows.Scan(&ipStr, &d.BytesIn, &d.BytesOut, &d.FlowCount); err != nil {
			return nil, fmt.Errorf("GetTopDestinations scan: %w", err)
		}
		d.IP = net.ParseIP(ipStr)
		results = append(results, d)
	}
	return results, rows.Err()
}

//
// Hosts
//

// UpsertHost inserts or updates a host record for the given session.
// The UNIQUE constraint on (session_id, ip) ensures only one row per host
// per session.
func (d *DB) UpsertHost(h *types.HostRecord) error {
	ipStr := ""
	if h.IP != nil {
		ipStr = h.IP.String()
	}
	macStr := ""
	if h.MAC != nil {
		macStr = h.MAC.String()
	}

	_, err := d.db.Exec(`
		INSERT INTO hosts(session_id, ip, mac, vendor, bytes_in, bytes_out,
			packets_in, packets_out, first_seen, last_seen)
		VALUES(?,?,?,?,?,?,?,?,?,?)
		ON CONFLICT(session_id, ip) DO UPDATE SET
			mac        = CASE WHEN excluded.mac != '' THEN excluded.mac ELSE mac END,
			vendor     = CASE WHEN excluded.vendor != '' THEN excluded.vendor ELSE vendor END,
			bytes_in   = excluded.bytes_in,
			bytes_out  = excluded.bytes_out,
			packets_in = excluded.packets_in,
			packets_out= excluded.packets_out,
			last_seen  = excluded.last_seen`,
		h.SessionID, ipStr, macStr, h.Vendor,
		h.BytesIn, h.BytesOut, h.PacketsIn, h.PacketsOut,
		encodeTime(h.FirstSeen), encodeTime(h.LastSeen),
	)
	if err != nil {
		return fmt.Errorf("UpsertHost(%s): %w", ipStr, err)
	}
	return nil
}

// GetAllHosts returns all hosts seen in a session.
func (d *DB) GetAllHosts(sessionID int64) ([]types.HostRecord, error) {
	rows, err := d.db.Query(`
		SELECT id, session_id, ip, mac, vendor,
			bytes_in, bytes_out, packets_in, packets_out,
			first_seen, last_seen
		FROM hosts WHERE session_id=?
		ORDER BY (bytes_in + bytes_out) DESC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("GetAllHosts: %w", err)
	}
	defer rows.Close()

	return scanHosts(rows)
}

// GetHostByIP returns the host record for a specific IP in a session.
func (d *DB) GetHostByIP(sessionID int64, ip string) (*types.HostRecord, error) {
	rows, err := d.db.Query(`
		SELECT id, session_id, ip, mac, vendor,
			bytes_in, bytes_out, packets_in, packets_out,
			first_seen, last_seen
		FROM hosts WHERE session_id=? AND ip=?
		LIMIT 1`,
		sessionID, ip,
	)
	if err != nil {
		return nil, fmt.Errorf("GetHostByIP query: %w", err)
	}
	defer rows.Close()

	hosts, err := scanHosts(rows)
	if err != nil || len(hosts) == 0 {
		return nil, err
	}
	return &hosts[0], nil
}

//
// DNS queries
//

// InsertDNSQuery persists a single DNS event observed during capture.
func (d *DB) InsertDNSQuery(sessionID int64, ev *types.DNSEvent, ts time.Time) error {
	clientStr, serverStr := "", ""
	if ev.ClientIP != nil {
		clientStr = ev.ClientIP.String()
	}
	if ev.ServerIP != nil {
		serverStr = ev.ServerIP.String()
	}
	response := strings.Join(ev.Answers, ",")

	_, err := d.db.Exec(`
		INSERT INTO dns_queries(session_id, client_ip, server_ip, query, qtype, is_response, response, ts)
		VALUES(?,?,?,?,?,?,?,?)`,
		sessionID, clientStr, serverStr,
		ev.QueryName, int(ev.QType),
		boolToInt(ev.IsResponse), response,
		encodeTime(ts),
	)
	if err != nil {
		return fmt.Errorf("InsertDNSQuery: %w", err)
	}
	return nil
}

//
// Alerts
//

// InsertAlert persists an alert generated by the Detector. Returns the new row ID.
func (d *DB) InsertAlert(a *types.Alert) (int64, error) {
	srcStr, dstStr := "", ""
	if a.SrcIP != nil {
		srcStr = a.SrcIP.String()
	}
	if a.DstIP != nil {
		dstStr = a.DstIP.String()
	}

	res, err := d.db.Exec(`
		INSERT INTO alerts(session_id, type, severity, src_ip, dst_ip, detail, ts)
		VALUES(?,?,?,?,?,?,?)`,
		a.SessionID,
		string(a.Type), string(a.Severity),
		srcStr, dstStr,
		a.Detail,
		encodeTime(a.Timestamp),
	)
	if err != nil {
		return 0, fmt.Errorf("InsertAlert: %w", err)
	}
	return res.LastInsertId()
}

// AcknowledgeAlert marks an alert as acknowledged.
func (d *DB) AcknowledgeAlert(id int64) error {
	_, err := d.db.Exec(`UPDATE alerts SET acknowledged=1 WHERE id=?`, id)
	if err != nil {
		return fmt.Errorf("AcknowledgeAlert(%d): %w", id, err)
	}
	return nil
}

// GetPagedAlerts returns alerts for a session, newest first.
func (d *DB) GetPagedAlerts(sessionID int64, page, pageSize int) (*types.PagedAlerts, error) {
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 200
	}
	offset := page * pageSize

	var total int64
	if err := d.db.QueryRow(
		`SELECT COUNT(*) FROM alerts WHERE session_id=?`, sessionID,
	).Scan(&total); err != nil {
		return nil, fmt.Errorf("GetPagedAlerts count: %w", err)
	}

	rows, err := d.db.Query(`
		SELECT id, session_id, type, severity, src_ip, dst_ip, detail, acknowledged, ts
		FROM alerts WHERE session_id=?
		ORDER BY ts DESC
		LIMIT ? OFFSET ?`,
		sessionID, pageSize, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("GetPagedAlerts query: %w", err)
	}
	defer rows.Close()

	alerts, err := scanAlerts(rows)
	if err != nil {
		return nil, err
	}

	return &types.PagedAlerts{
		Alerts:     alerts,
		TotalCount: total,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

// GetUnacknowledgedCount returns the number of unread alerts for a session.
func (d *DB) GetUnacknowledgedCount(sessionID int64) (int, error) {
	var n int
	err := d.db.QueryRow(
		`SELECT COUNT(*) FROM alerts WHERE session_id=? AND acknowledged=0`,
		sessionID,
	).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("GetUnacknowledgedCount: %w", err)
	}
	return n, nil
}

//
// Snapshots
//

// InsertSnapshot persists a TrafficSnapshot for historical replay and graphing.
func (d *DB) InsertSnapshot(sessionID int64, snap *types.TrafficSnapshot) error {
	protoDist, err := json.Marshal(snap.ProtocolStats)
	if err != nil {
		protoDist = []byte("{}")
	}

	_, err = d.db.Exec(`
		INSERT INTO snapshots(session_id, ts, bytes_in, bytes_out, packets_in, packets_out, protocol_dist)
		VALUES(?,?,?,?,?,?,?)`,
		sessionID,
		encodeTime(snap.IntervalEnd),
		snap.BytesIn, snap.BytesOut,
		snap.PacketsIn, snap.PacketsOut,
		string(protoDist),
	)
	if err != nil {
		return fmt.Errorf("InsertSnapshot: %w", err)
	}
	return nil
}

//
// Settings
//

// GetSetting retrieves a single key-value setting. Returns ("", nil) when
// the key does not exist.
func (d *DB) GetSetting(key string) (string, error) {
	var value string
	err := d.db.QueryRow(
		`SELECT value FROM settings WHERE key=?`, key,
	).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("GetSetting(%q): %w", key, err)
	}
	return value, nil
}

// SetSetting writes a key-value setting, inserting or replacing as needed.
func (d *DB) SetSetting(key, value string) error {
	_, err := d.db.Exec(
		`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
		key, value,
	)
	if err != nil {
		return fmt.Errorf("SetSetting(%q): %w", key, err)
	}
	return nil
}

// GetSettings deserialises the full Settings struct from the key-value store.
// Returns DefaultSettings() when no settings have been saved yet.
func (d *DB) GetSettings() (*types.Settings, error) {
	val, err := d.GetSetting("settings")
	if err != nil {
		return nil, err
	}
	if val == "" {
		s := types.DefaultSettings()
		return &s, nil
	}
	var s types.Settings
	if err := json.Unmarshal([]byte(val), &s); err != nil {
		// Corrupted settings — return defaults rather than propagating
		def := types.DefaultSettings()
		return &def, nil
	}
	return &s, nil
}

// SaveSettings serialises the full Settings struct to the key-value store.
func (d *DB) SaveSettings(s *types.Settings) error {
	data, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("SaveSettings marshal: %w", err)
	}
	return d.SetSetting("settings", string(data))
}

//
// CSV / JSON export helpers
//

// ExportFlowsCSV writes all flows for a session to a CSV-formatted string.
// Callers should write this string to a file; keeping the logic here keeps
// the SessionService thin.
func (d *DB) ExportFlowsCSV(sessionID int64) (string, error) {
	rows, err := d.db.Query(`
		SELECT src_ip, dst_ip, src_port, dst_port, protocol,
			bytes_in, bytes_out, packets_in, packets_out,
			started_at, last_seen_at, closed
		FROM flows WHERE session_id=?
		ORDER BY (bytes_in + bytes_out) DESC`,
		sessionID,
	)
	if err != nil {
		return "", fmt.Errorf("ExportFlowsCSV query: %w", err)
	}
	defer rows.Close()

	var sb strings.Builder
	sb.WriteString("src_ip,dst_ip,src_port,dst_port,protocol,bytes_in,bytes_out,packets_in,packets_out,started_at,last_seen_at,closed\n")

	for rows.Next() {
		var (
			srcIP, dstIP          string
			srcPort, dstPort      int
			proto, closed         int
			bytesIn, bytesOut     int64
			packetsIn, packetsOut int64
			startedAt, lastSeenAt string
		)
		if err := rows.Scan(
			&srcIP, &dstIP, &srcPort, &dstPort, &proto,
			&bytesIn, &bytesOut, &packetsIn, &packetsOut,
			&startedAt, &lastSeenAt, &closed,
		); err != nil {
			return "", fmt.Errorf("ExportFlowsCSV scan: %w", err)
		}
		fmt.Fprintf(&sb, "%s,%s,%d,%d,%d,%d,%d,%d,%d,%s,%s,%d\n",
			srcIP, dstIP, srcPort, dstPort, proto,
			bytesIn, bytesOut, packetsIn, packetsOut,
			startedAt, lastSeenAt, closed,
		)
	}
	return sb.String(), rows.Err()
}

// ExportFlowsJSON serialises all flows for a session to a JSON array string.
func (d *DB) ExportFlowsJSON(sessionID int64) (string, error) {
	flows, err := d.GetPagedFlows(sessionID, 0, 500) // first page only for reasonable size
	if err != nil {
		return "", err
	}
	data, err := json.MarshalIndent(flows.Flows, "", "  ")
	if err != nil {
		return "", fmt.Errorf("ExportFlowsJSON marshal: %w", err)
	}
	return string(data), nil
}

//
// Scan helpers
//

func scanFlows(rows *sql.Rows) ([]types.FlowRecord, error) {
	var result []types.FlowRecord
	for rows.Next() {
		var f types.FlowRecord
		var srcIP, dstIP string
		var proto, closed int
		var startedStr, lastSeenStr string

		if err := rows.Scan(
			&f.ID, &f.SessionID,
			&srcIP, &dstIP,
			&f.SrcPort, &f.DstPort, &proto,
			&f.BytesIn, &f.BytesOut, &f.PacketsIn, &f.PacketsOut,
			&startedStr, &lastSeenStr, &closed,
		); err != nil {
			return nil, fmt.Errorf("scanFlows: %w", err)
		}

		f.SrcIP = net.ParseIP(srcIP)
		f.DstIP = net.ParseIP(dstIP)
		f.Protocol = types.Protocol(proto)
		f.Closed = closed != 0

		var err error
		f.StartedAt, err = decodeTime(startedStr)
		if err != nil {
			return nil, fmt.Errorf("scanFlows decode started_at: %w", err)
		}
		f.LastSeenAt, err = decodeTime(lastSeenStr)
		if err != nil {
			return nil, fmt.Errorf("scanFlows decode last_seen_at: %w", err)
		}

		result = append(result, f)
	}
	return result, rows.Err()
}

func scanHosts(rows *sql.Rows) ([]types.HostRecord, error) {
	var result []types.HostRecord
	for rows.Next() {
		var h types.HostRecord
		var ipStr, macStr string
		var firstStr, lastStr string

		if err := rows.Scan(
			&h.ID, &h.SessionID,
			&ipStr, &macStr, &h.Vendor,
			&h.BytesIn, &h.BytesOut, &h.PacketsIn, &h.PacketsOut,
			&firstStr, &lastStr,
		); err != nil {
			return nil, fmt.Errorf("scanHosts: %w", err)
		}

		h.IP = net.ParseIP(ipStr)
		if macStr != "" {
			mac, err := net.ParseMAC(macStr)
			if err == nil {
				h.MAC = mac
			}
		}

		var err error
		h.FirstSeen, err = decodeTime(firstStr)
		if err != nil {
			return nil, fmt.Errorf("scanHosts decode first_seen: %w", err)
		}
		h.LastSeen, err = decodeTime(lastStr)
		if err != nil {
			return nil, fmt.Errorf("scanHosts decode last_seen: %w", err)
		}

		result = append(result, h)
	}
	return result, rows.Err()
}

func scanAlerts(rows *sql.Rows) ([]types.Alert, error) {
	var result []types.Alert
	for rows.Next() {
		var a types.Alert
		var typeStr, sevStr, srcStr, dstStr, tsStr string
		var acked int

		if err := rows.Scan(
			&a.ID, &a.SessionID,
			&typeStr, &sevStr,
			&srcStr, &dstStr,
			&a.Detail, &acked, &tsStr,
		); err != nil {
			return nil, fmt.Errorf("scanAlerts: %w", err)
		}

		a.Type = types.AlertType(typeStr)
		a.Severity = types.AlertSeverity(sevStr)
		a.Acknowledged = acked != 0
		if srcStr != "" {
			a.SrcIP = net.ParseIP(srcStr)
		}
		if dstStr != "" {
			a.DstIP = net.ParseIP(dstStr)
		}

		var err error
		a.Timestamp, err = decodeTime(tsStr)
		if err != nil {
			return nil, fmt.Errorf("scanAlerts decode ts: %w", err)
		}

		result = append(result, a)
	}
	return result, rows.Err()
}

func scanHostSummaries(rows *sql.Rows) ([]types.HostSummary, error) {
	var result []types.HostSummary
	for rows.Next() {
		var h types.HostSummary
		var ipStr string
		if err := rows.Scan(&ipStr, &h.BytesOut, &h.BytesIn, &h.FlowCount); err != nil {
			return nil, fmt.Errorf("scanHostSummaries: %w", err)
		}
		h.IP = net.ParseIP(ipStr)
		result = append(result, h)
	}
	return result, rows.Err()
}

//
// Utility
//

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
