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
