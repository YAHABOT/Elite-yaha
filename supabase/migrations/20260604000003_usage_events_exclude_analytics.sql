-- Add excluded_from_analytics flag to usage_events so admins can mark
-- specific events (e.g. intentionally dismissed cards) as noise and exclude
-- them from accuracy calculations.
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS excluded_from_analytics BOOLEAN NOT NULL DEFAULT false;

-- Allow service-role updates (admin toggle) — the existing RLS policies only
-- cover the anon/user role; service role bypasses RLS by default.
CREATE INDEX IF NOT EXISTS usage_events_excluded_idx ON usage_events(excluded_from_analytics);
