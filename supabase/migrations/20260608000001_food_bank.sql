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
