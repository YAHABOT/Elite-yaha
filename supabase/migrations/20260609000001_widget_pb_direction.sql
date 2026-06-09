-- Add pb_direction column to widgets table
-- 'above' = higher is better (PB = max), 'below' = lower is better (PB = min)
ALTER TABLE widgets
  ADD COLUMN IF NOT EXISTS pb_direction TEXT DEFAULT 'above'
    CHECK (pb_direction IN ('above', 'below'));
