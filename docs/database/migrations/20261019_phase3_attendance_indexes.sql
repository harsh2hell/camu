-- ==============================================================================
-- Migration: Phase 3 Attendance Performance Indexes & Constraints
-- Target: PostgreSQL 15+
-- Description: Adds indexes and constraints for high-concurrency roll-call & attendance audits
-- ==============================================================================

-- 1. Attendance session indexing for quick teacher and course lookups
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_offering ON attendance_sessions(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_faculty ON attendance_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);

-- 2. Attendance records indexing for fast student aggregation and duplicate prevention
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);

-- 3. Verify unique constraint preventing duplicate student records in same session
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_session_student'
    ) THEN
        ALTER TABLE attendance_records 
        ADD CONSTRAINT unique_session_student UNIQUE (session_id, student_id);
    END IF;
END $$;
