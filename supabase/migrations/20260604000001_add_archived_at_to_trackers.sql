-- Add soft-delete/archive column to trackers
-- NULL = active tracker, non-NULL timestamp = archived
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
