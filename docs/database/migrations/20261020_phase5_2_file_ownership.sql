-- ==============================================================================
-- CAMU-NEXT DATABASE MIGRATION: Phase 5.2 - Durable File Ownership & Tracking
-- File: docs/database/migrations/20261020_phase5_2_file_ownership.sql
-- ==============================================================================

-- 1. Create durable uploaded_files registry to persist file ownership across restarts and instances
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key VARCHAR(255) UNIQUE NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add performance indexes for lookups by owner and file_key
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_key ON uploaded_files(file_key);
