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
