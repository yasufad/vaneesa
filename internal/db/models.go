package db

import "time"

// Settings

// Settings holds user-configurable capture preferences persisted in the database.
type Settings struct {
	DefaultInterface string `json:"defaultInterface"`
	PromiscuousMode  bool   `json:"promiscuousMode"`
	BPFFilter        string `json:"bpfFilter"`
}

// DefaultSettings returns the out-of-box settings applied on first launch.
func DefaultSettings() Settings {
	return Settings{
		DefaultInterface: "",
		PromiscuousMode:  false,
		BPFFilter:        "",
	}
}

// Detector Thresholds

// DetectorThresholds holds configurable trigger points for every anomaly detector.
// All fields are stored individually in the settings key-value table so that
// new thresholds can be added in future migrations without a schema change.
type DetectorThresholds struct {
	// RateSpikeMultiplier is how many times the 60-second rolling average a burst
	// must exceed before a RateSpike alert fires. Default: 5.
	RateSpikeMultiplier int `json:"rateSpikeMultiplier"`

	// RateSpikeMinimumPPS suppresses rate-spike alerts on quiet interfaces where
	// even a small burst would produce a large multiplier. Default: 10 pps.
	RateSpikeMinimumPPS int `json:"rateSpikeMinimumPPS"`

	// PortScanThreshold is the distinct destination port count contacted by a
	// single source within 10 seconds that triggers a PortScan alert. Default: 20.
	PortScanThreshold int `json:"portScanThreshold"`

	// SYNFloodRatio is the SYN-to-SYN-ACK ratio above which a SynFlood alert fires.
	// Expressed as the numerator (e.g. 10 means a 10:1 ratio). Default: 10.
	SYNFloodRatio int `json:"synFloodRatio"`

	// SYNFloodMinimumSYNs prevents false positives on low-traffic segments by
	// requiring a minimum SYN count per second before flood detection activates.
	// Default: 50.
	SYNFloodMinimumSYNs int `json:"synFloodMinimumSYNs"`
}

// DefaultDetectorThresholds returns production-sensible values for a typical
// office or small business network segment.
func DefaultDetectorThresholds() DetectorThresholds {
	return DetectorThresholds{
		RateSpikeMultiplier: 5,
		RateSpikeMinimumPPS: 10,
		PortScanThreshold:   20,
		SYNFloodRatio:       10,
		SYNFloodMinimumSYNs: 50,
	}
}

// Sessions

// SessionStatus represents the lifecycle state of a capture session.
type SessionStatus string

const (
	SessionStatusActive SessionStatus = "active"
	SessionStatusEnded  SessionStatus = "ended"
)

// Session is the fully populated session record including all metadata.
type Session struct {
	ID        int64         `json:"id"`
	Name      string        `json:"name"`
	Interface string        `json:"interface"`
	Filter    string        `json:"filter"`
	Status    SessionStatus `json:"status"`
	StartedAt time.Time     `json:"startedAt"`
	EndedAt   *time.Time    `json:"endedAt,omitempty"`
}

// SessionSummary is the lightweight projection used in the Sessions list view.
// DurationSeconds is computed from started_at / ended_at at query time.
type SessionSummary struct {
	ID              int64         `json:"id"`
	Name            string        `json:"name"`
	Status          SessionStatus `json:"status"`
	StartedAt       time.Time     `json:"startedAt"`
	EndedAt         *time.Time    `json:"endedAt,omitempty"`
	DurationSeconds int64         `json:"durationSeconds"`
}
