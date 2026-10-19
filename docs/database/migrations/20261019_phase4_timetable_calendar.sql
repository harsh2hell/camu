-- ==============================================================================
-- CAMU-NEXT DATABASE MIGRATION
-- Migration: 20261019_phase4_timetable_calendar.sql
-- Description: Add optional note column to timetable_slots and event_date to notices
-- ==============================================================================

-- 1. Add optional note column to timetable_slots (e.g. lab preparation notes)
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS note TEXT;

-- 1b. Expand room_number length to 64 chars to support descriptive lab and block identifiers
ALTER TABLE timetable_slots ALTER COLUMN room_number TYPE VARCHAR(64);

-- 2. Add optional event_date to notices for calendar event timeline support
ALTER TABLE notices ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;

-- 3. Compound index on notices for calendar event queries
CREATE INDEX IF NOT EXISTS idx_notices_calendar ON notices(category, event_date);

-- 4. Compound index on timetable_slots for day and time sorting
CREATE INDEX IF NOT EXISTS idx_timetable_day_time ON timetable_slots(day_name, start_time);
