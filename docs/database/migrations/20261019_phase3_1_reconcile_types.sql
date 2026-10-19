-- ==============================================================================
-- Migration: Phase 3.1 Schema & Type Reconciliation
-- Target: PostgreSQL 15+
-- Description: Reconciles start_time and end_time column types with Prisma String representation
-- ==============================================================================

-- 1. attendance_sessions.start_time: convert to VARCHAR(32) for formatted timestamps (e.g. "10:00 AM")
ALTER TABLE attendance_sessions 
ALTER COLUMN start_time TYPE VARCHAR(32);

-- 2. timetable_slots.start_time and end_time: convert to VARCHAR(32)
ALTER TABLE timetable_slots 
ALTER COLUMN start_time TYPE VARCHAR(32),
ALTER COLUMN end_time TYPE VARCHAR(32);
