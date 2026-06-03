-- Add target_display column to widgets table
-- Controls how a widget's target progress indicator is rendered
-- Values: 'bar' (default) | 'ring' | 'number' | 'hide'

ALTER TABLE widgets ADD COLUMN IF NOT EXISTS target_display TEXT DEFAULT 'bar';
