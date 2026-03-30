// Re-export settings types from Wails bindings for use in frontend code.
// This file provides a stable import path that survives binding regeneration.

export type { Settings } from "../bindings/github.com/yasufad/vaneesa/internal/db/models";
export type { DetectorThresholds } from "../bindings/github.com/yasufad/vaneesa/internal/db/models";
