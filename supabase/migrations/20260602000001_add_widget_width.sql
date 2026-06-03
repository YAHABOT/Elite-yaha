ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS width TEXT NOT NULL DEFAULT 'half'
    CHECK (width IN ('half', 'full'));
