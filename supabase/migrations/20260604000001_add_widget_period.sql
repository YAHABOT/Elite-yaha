-- Add period column to widgets table
-- Enables 'this_week' and 'last_week' period modes that filter Mon→today / Mon–Sun
-- Without this column the period was silently dropped and every widget fell back to days:7

ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS period TEXT DEFAULT NULL;
