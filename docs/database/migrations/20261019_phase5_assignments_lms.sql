-- ==============================================================================
-- CAMU-NEXT DATABASE MIGRATION: Phase 5 - Assignments & LMS Support
-- File: docs/database/migrations/20261019_phase5_assignments_lms.sql
-- ==============================================================================

-- 1. Add publication status to assignments
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- 2. Allow text submissions and make submission_file_url optional (supports code/text submissions)
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS submission_text TEXT;

ALTER TABLE assignment_submissions 
ALTER COLUMN submission_file_url DROP NOT NULL;

-- 3. Add performance indexes for course assignments and student lookups
CREATE INDEX IF NOT EXISTS idx_assignments_offering_due 
ON assignments(course_offering_id, due_date);

CREATE INDEX IF NOT EXISTS idx_submissions_student 
ON assignment_submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment 
ON assignment_submissions(assignment_id);
