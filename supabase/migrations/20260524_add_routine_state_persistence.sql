-- Add routine execution state to user_day_state for persistence across page reloads
-- Fixes bugs: V32-EX6 (step halting), V32-EX17 (restart on reload)

ALTER TABLE user_day_state
  ADD COLUMN active_routine_id UUID,
  ADD COLUMN current_step_index INT DEFAULT 0,
  ADD COLUMN routine_step_data JSONB DEFAULT '{}',
  ADD COLUMN routine_last_activity_at TIMESTAMPTZ;

-- Create partial index for active routines (non-null active_routine_id)
CREATE INDEX user_day_state_active_routine_idx
ON user_day_state(user_id, date) WHERE active_routine_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN user_day_state.active_routine_id IS 'UUID of the currently executing routine (null if none active)';
COMMENT ON COLUMN user_day_state.current_step_index IS 'Zero-based index of current step (0 = first step)';
COMMENT ON COLUMN user_day_state.routine_step_data IS 'Persisted step field values across page reloads (JSON object)';
COMMENT ON COLUMN user_day_state.routine_last_activity_at IS 'Timestamp of last routine interaction (used for timeout detection)';
