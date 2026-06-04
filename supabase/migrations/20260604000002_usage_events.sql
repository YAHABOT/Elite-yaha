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
