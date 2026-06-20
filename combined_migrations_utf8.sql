-- ============================================================
-- YAHA Initial Schema â€” 9 Core Tables
-- ============================================================

-- 1. USERS (extends auth.users with app-specific data)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT,
  targets JSONB NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  telegram_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON public.users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. TRACKERS
CREATE TABLE IF NOT EXISTS public.trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  color TEXT NOT NULL DEFAULT '#10b981',
  schema JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their trackers" ON public.trackers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX trackers_user_id_idx ON public.trackers(user_id);

-- 3. TRACKER_LOGS
CREATE TABLE IF NOT EXISTS public.tracker_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fields JSONB NOT NULL DEFAULT '{}',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tracker_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their logs" ON public.tracker_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX tracker_logs_user_id_idx ON public.tracker_logs(user_id);
CREATE INDEX tracker_logs_tracker_id_idx ON public.tracker_logs(tracker_id);
CREATE INDEX tracker_logs_logged_at_idx ON public.tracker_logs(logged_at);

-- 4. CHAT_SESSIONS
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_sessions_user_id_idx ON public.chat_sessions(user_id);

-- 5. CHAT_MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
-- Messages policy uses session ownership (join through chat_sessions)
CREATE POLICY "Users own messages through sessions" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );
CREATE INDEX chat_messages_session_id_idx ON public.chat_messages(session_id);

-- 6. ROUTINES
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_phrase TEXT,
  type TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'day_start', 'day_end')),
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their routines" ON public.routines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX routines_user_id_idx ON public.routines(user_id);

-- 7. CORRELATIONS
CREATE TABLE IF NOT EXISTS public.correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  formula JSONB NOT NULL DEFAULT '[]',
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their correlations" ON public.correlations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX correlations_user_id_idx ON public.correlations(user_id);

-- 8. DAILY_STATS
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their stats" ON public.daily_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX daily_stats_user_id_idx ON public.daily_stats(user_id);
CREATE INDEX daily_stats_date_idx ON public.daily_stats(date);

-- 9. TELEGRAM_EVENTS
CREATE TABLE IF NOT EXISTS public.telegram_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  raw JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.telegram_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their telegram events" ON public.telegram_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX telegram_events_user_id_idx ON public.telegram_events(user_id);

-- ============================================================
-- Trigger: auto-update updated_at on modification
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables that have the column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trackers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.correlations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.daily_stats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- Migration: create widgets table for customizable dashboard
-- 2026-03-12

CREATE TABLE IF NOT EXISTS public.widgets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('field_latest', 'field_average', 'field_total', 'correlator')),
  label           TEXT        NOT NULL,
  tracker_id      UUID        REFERENCES public.trackers(id) ON DELETE SET NULL,
  field_id        TEXT,
  correlation_id  UUID        REFERENCES public.correlations(id) ON DELETE SET NULL,
  days            INT         NOT NULL DEFAULT 7 CHECK (days >= 1 AND days <= 365),
  position        INT         NOT NULL DEFAULT 0,
  color           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their widgets"
  ON public.widgets
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fast lookup by owner (list, reorder)
CREATE INDEX widgets_user_id_idx      ON public.widgets (user_id);
-- Ordered dashboard rendering
CREATE INDEX widgets_user_position_idx ON public.widgets (user_id, position);
-- Add routine and agent tracking to chat_sessions
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS active_routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_step_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_agent_id UUID; -- REFERENCES agents(id) added after table creation

-- Create AGENTS table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  exit_trigger TEXT NOT NULL DEFAULT 'exit',
  system_prompt TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#a855f7',
  schema JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their agents" ON public.agents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX agents_user_id_idx ON public.agents(user_id);

-- Add ForeignKey to chat_sessions for active_agent_id
ALTER TABLE public.chat_sessions
ADD CONSTRAINT chat_sessions_active_agent_id_fkey 
FOREIGN KEY (active_agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- Trigger for agents updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- Migration: fix placeholder UUID in routine steps
-- Replaces 'SLEEP_TRACKER_ID_PLACEHOLDER' in routines.steps with the real
-- sleep tracker id for each user.  Safe to run multiple times (idempotent).

UPDATE routines r
SET steps = (
  SELECT jsonb_agg(
    CASE
      WHEN (step->>'trackerId') = 'SLEEP_TRACKER_ID_PLACEHOLDER'
      THEN jsonb_set(
        step,
        '{trackerId}',
        to_jsonb((
          SELECT id::text
          FROM trackers
          WHERE user_id = r.user_id
            AND LOWER(name) LIKE '%sleep%'
          LIMIT 1
        ))
      )
      ELSE step
    END
  )
  FROM jsonb_array_elements(r.steps) AS step
)
WHERE steps::text LIKE '%SLEEP_TRACKER_ID_PLACEHOLDER%';
-- Migration: cleanup_empty_chat_sessions
-- Purpose: Delete all "New Chat" sessions with zero messages.
-- Root cause: March 2026 builds created sessions on every page load before
-- session creation was gated behind first-message-send. These are orphaned rows.
-- Safe to run: only deletes sessions with title = 'New Chat' AND no messages.

DELETE FROM chat_sessions
WHERE title = 'New Chat'
  AND NOT EXISTS (
    SELECT 1
    FROM chat_messages
    WHERE chat_messages.session_id = chat_sessions.id
  );
-- Make current_step_index nullable so NULL can signal "no routine in progress".
-- Previously DEFAULT 0 with NOT NULL made 0 ambiguous (step 0 vs no routine).
-- NULL = no routine active; 0+ = step index within the active routine.
ALTER TABLE public.chat_sessions
  ALTER COLUMN current_step_index DROP NOT NULL,
  ALTER COLUMN current_step_index DROP DEFAULT;
-- Create user_day_state table to track daily session state
CREATE TABLE user_day_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,  -- YYYY-MM-DD format (client local date)
  day_started_at TIMESTAMPTZ,
  day_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_day_state ENABLE ROW LEVEL SECURITY;

-- Users can only access their own day state
CREATE POLICY "Users own their day state"
ON user_day_state FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX user_day_state_user_id_date_idx
ON user_day_state(user_id, date DESC);

CREATE INDEX user_day_state_user_id_open_idx
ON user_day_state(user_id) WHERE day_ended_at IS NULL;
-- Add UNIQUE constraint for user_day_state upsert operations
-- The constraint (user_id, date) allows upsert to work correctly with onConflict: 'user_id,date'
ALTER TABLE user_day_state
ADD CONSTRAINT user_day_state_user_id_date_unique UNIQUE (user_id, date);
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
-- Migration: Convert numeric seconds back to "HH:MM" strings for 'time' type fields
--
-- Context: The 20260531_time_to_duration_field.sql migration converted ALL 'time' schema
-- fields to 'duration' and their stored values from strings ("23:30") to seconds (84600).
-- However, time-of-day fields (Sleep Start, Sleep End) should NOT have been converted â€”
-- they are clock times, not elapsed durations.
--
-- After manually changing those fields back to type='time' in the schema editor, their
-- stored log values are now integers (seconds since midnight). This migration converts
-- those integers back to "HH:MM" strings so <input type="time"> displays them correctly.
--
-- Safe to run at any time â€” only affects fields where:
--   1. The tracker schema has type='time' for that fieldId
--   2. The stored JSON value is a number (not already a string)
--   3. The value is in the valid 0â€“86399 range (one day in seconds)

DO $$
DECLARE
  tracker_rec  RECORD;
  field_rec    RECORD;
  log_rec      RECORD;
  seconds_val  INTEGER;
  time_str     TEXT;
BEGIN
  -- Iterate over trackers that have at least one field with type='time'
  FOR tracker_rec IN
    SELECT id, schema
    FROM trackers
    WHERE schema @> '[{"type": "time"}]'
  LOOP
    -- For each 'time' field in this tracker's schema
    FOR field_rec IN
      SELECT field->>'fieldId' AS field_id
      FROM jsonb_array_elements(tracker_rec.schema) AS field
      WHERE field->>'type' = 'time'
    LOOP
      -- For each log where the value for this field is a JSON number (not a string)
      FOR log_rec IN
        SELECT id, fields
        FROM tracker_logs
        WHERE tracker_id = tracker_rec.id
          AND fields ? field_rec.field_id
          AND jsonb_typeof(fields->field_rec.field_id) = 'number'
      LOOP
        seconds_val := (log_rec.fields->>field_rec.field_id)::INTEGER;

        -- Only convert values that are valid time-of-day seconds (0â€“86399)
        IF seconds_val >= 0 AND seconds_val < 86400 THEN
          -- Convert seconds since midnight â†’ "HH:MM"
          time_str := LPAD((seconds_val / 3600)::TEXT, 2, '0') || ':' ||
                      LPAD(((seconds_val % 3600) / 60)::TEXT, 2, '0');

          UPDATE tracker_logs
          SET fields = jsonb_set(
            fields,
            ARRAY[field_rec.field_id],
            to_jsonb(time_str)
          )
          WHERE id = log_rec.id;
        END IF;

      END LOOP; -- logs
    END LOOP; -- fields
  END LOOP; -- trackers
END $$;
-- Migration: Convert 'time' field type to 'duration' (stored as total seconds)
--
-- Context: The old 'time' field type used <input type="time"> (AM/PM clock face) for manual
-- entry and stored values inconsistently:
--   - Manual entries: string "HH:MM" (from <input type="time">)
--   - AI entries: decimal hours (e.g., 2.2 = 2h 12m)
--
-- The new 'duration' field type stores total seconds as a plain integer, which is
-- unambiguous, device-agnostic, and directly displayable as "Xh Ym Zs".
--
-- Conversion rules:
--   - String "HH:MM" â†’ H*3600 + M*60   (clock-picker input, user intended HH:MM as duration)
--   - String "HH:MM:SS" â†’ H*3600+M*60+S
--   - Number (decimal hours from AI) â†’ ROUND(value * 3600)
--   - Invalid / unparseable values â†’ NULL (user can re-log)

-- â”€â”€ Step 1: Update tracker schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Replace any field with type='time' to type='duration' in the schema JSONB array.

UPDATE trackers
SET
  schema = (
    SELECT jsonb_agg(
      CASE
        WHEN field->>'type' = 'time'
          THEN jsonb_set(field, '{type}', '"duration"')
        ELSE field
      END
    )
    FROM jsonb_array_elements(schema) AS field
  ),
  updated_at = now()
WHERE schema @> '[{"type": "time"}]';

-- â”€â”€ Step 2: Convert existing log values to seconds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Only update logs belonging to trackers that now have 'duration' fields.
-- For each affected tracker, find the fieldIds that are duration type and convert.

DO $$
DECLARE
  tracker_rec  RECORD;
  field_rec    RECORD;
  log_rec      RECORD;
  raw_val      TEXT;
  new_seconds  INTEGER;
  parts        TEXT[];
  h            INTEGER;
  m            INTEGER;
  s            INTEGER;
  decimal_hrs  FLOAT;
BEGIN
  -- Iterate over all trackers that have at least one 'duration' field
  FOR tracker_rec IN
    SELECT id, schema
    FROM trackers
    WHERE schema @> '[{"type": "duration"}]'
  LOOP
    -- Iterate over each duration field in the tracker schema
    FOR field_rec IN
      SELECT field->>'fieldId' AS field_id
      FROM jsonb_array_elements(tracker_rec.schema) AS field
      WHERE field->>'type' = 'duration'
    LOOP
      -- Iterate over each log entry that has a value for this field
      FOR log_rec IN
        SELECT id, fields
        FROM tracker_logs
        WHERE tracker_id = tracker_rec.id
          AND fields ? field_rec.field_id
          AND fields->>field_rec.field_id IS NOT NULL
      LOOP
        raw_val := log_rec.fields->>field_rec.field_id;
        new_seconds := NULL;

        -- Try to parse: decimal number (AI stored as decimal hours)
        BEGIN
          decimal_hrs := raw_val::FLOAT;
          -- Decimal hours â†’ seconds (AI format)
          -- Guard: reject values that don't look like real durations
          IF decimal_hrs >= 0 AND decimal_hrs <= 24 THEN
            new_seconds := ROUND(decimal_hrs * 3600)::INTEGER;
          END IF;
        EXCEPTION WHEN others THEN
          -- Not a plain number â€” try string formats below
          new_seconds := NULL;
        END;

        -- If it parsed as a float but looks like it could be a string time format, re-check
        -- A string like "02:12" will fail ::FLOAT cast â†’ handled by string parsing below
        IF new_seconds IS NULL THEN
          -- Try HH:MM:SS
          IF raw_val ~ '^\d{1,2}:\d{2}:\d{2}$' THEN
            parts := string_to_array(raw_val, ':');
            h := parts[1]::INTEGER;
            m := parts[2]::INTEGER;
            s := parts[3]::INTEGER;
            new_seconds := h * 3600 + m * 60 + s;
          -- Try HH:MM (from old <input type="time"> â€” user entered hours:minutes as duration)
          ELSIF raw_val ~ '^\d{1,2}:\d{2}$' THEN
            parts := string_to_array(raw_val, ':');
            h := parts[1]::INTEGER;
            m := parts[2]::INTEGER;
            new_seconds := h * 3600 + m * 60;
          END IF;
        END IF;

        -- Sanity check: reject values outside 0â€“24h range
        IF new_seconds IS NOT NULL AND (new_seconds < 0 OR new_seconds > 86400) THEN
          new_seconds := NULL;
        END IF;

        -- Write the converted value back
        UPDATE tracker_logs
        SET fields = jsonb_set(
          fields,
          ARRAY[field_rec.field_id],
          COALESCE(new_seconds::TEXT::JSONB, 'null'::JSONB)
        )
        WHERE id = log_rec.id;

      END LOOP; -- logs
    END LOOP; -- fields
  END LOOP; -- trackers
END $$;
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS width TEXT NOT NULL DEFAULT 'half'
    CHECK (width IN ('half', 'full'));
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS extra_fields JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.widgets
  DROP CONSTRAINT IF EXISTS widgets_type_check;

ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('field_latest','field_average','field_total','correlator','tracker_latest'));
-- Add target_display column to widgets table
-- Controls how a widget's target progress indicator is rendered
-- Values: 'bar' (default) | 'ring' | 'number' | 'hide'

ALTER TABLE widgets ADD COLUMN IF NOT EXISTS target_display TEXT DEFAULT 'bar';
-- AI Summaries: user config + generated report storage

CREATE TABLE summary_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  enabled       BOOLEAN NOT NULL DEFAULT false,
  instructions  TEXT NOT NULL DEFAULT '',
  linked_fields JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type)
);

ALTER TABLE summary_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their summary configs"
  ON summary_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX summary_configs_user_id_idx ON summary_configs(user_id);

CREATE TABLE summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  content      JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type, period_start)
);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their summaries"
  ON summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX summaries_user_id_type_idx ON summaries(user_id, type);
CREATE INDEX summaries_period_start_idx ON summaries(period_start DESC);
CREATE TABLE daily_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  targets_count INTEGER NOT NULL DEFAULT 0,
  targets_hit INTEGER NOT NULL DEFAULT 0,
  achievements JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their daily scores" ON daily_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX daily_scores_user_date_idx ON daily_scores(user_id, date);
-- Add 'combined_field' to the widgets type constraint
ALTER TABLE public.widgets
  DROP CONSTRAINT IF EXISTS widgets_type_check;

ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('field_latest','field_average','field_total','correlator','tracker_latest','combined_field'));
-- Add soft-delete/archive column to trackers
-- NULL = active tracker, non-NULL timestamp = archived
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
-- Add period column to widgets table
-- Enables 'this_week' and 'last_week' period modes that filter Monâ†’today / Monâ€“Sun
-- Without this column the period was silently dropped and every widget fell back to days:7

ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS period TEXT DEFAULT NULL;
CREATE TABLE IF NOT EXISTS usage_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events"
  ON usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own events"
  ON usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX usage_events_user_id_idx     ON usage_events(user_id);
CREATE INDEX usage_events_event_type_idx  ON usage_events(event_type);
CREATE INDEX usage_events_created_at_idx  ON usage_events(created_at DESC);
-- Add excluded_from_analytics flag to usage_events so admins can mark
-- specific events (e.g. intentionally dismissed cards) as noise and exclude
-- them from accuracy calculations.
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS excluded_from_analytics BOOLEAN NOT NULL DEFAULT false;

-- Allow service-role updates (admin toggle) â€” the existing RLS policies only
-- cover the anon/user role; service role bypasses RLS by default.
CREATE INDEX IF NOT EXISTS usage_events_excluded_idx ON usage_events(excluded_from_analytics);
CREATE TABLE feedback_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('very_helpful', 'helpful_needs_work', 'not_helpful')),
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
ON feedback_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
ON feedback_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX feedback_responses_user_id_idx ON feedback_responses(user_id);
CREATE INDEX feedback_responses_created_at_idx ON feedback_responses(created_at DESC);
CREATE TABLE food_bank_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  entry_type      TEXT NOT NULL DEFAULT 'dish' CHECK (entry_type IN ('dish', 'pantry_item')),
  shortcut        TEXT,
  emoji           TEXT,
  serving_label   TEXT,
  serving_size_g  NUMERIC,
  kcal            NUMERIC NOT NULL,
  protein_g       NUMERIC NOT NULL,
  carbs_g         NUMERIC NOT NULL,
  fat_g           NUMERIC NOT NULL,
  fibre_g         NUMERIC,
  ingredients     JSONB,
  batch_yield_g   NUMERIC,
  batch_kcal      NUMERIC,
  batch_protein_g NUMERIC,
  batch_carbs_g   NUMERIC,
  batch_fat_g     NUMERIC,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE food_bank_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their food bank"
  ON food_bank_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX food_bank_entries_user_id_idx ON food_bank_entries(user_id);
-- Add pb_direction column to widgets table
-- 'above' = higher is better (PB = max), 'below' = lower is better (PB = min)
ALTER TABLE widgets
  ADD COLUMN IF NOT EXISTS pb_direction TEXT DEFAULT 'above'
    CHECK (pb_direction IN ('above', 'below'));
