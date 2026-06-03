-- Add 'combined_field' to the widgets type constraint
ALTER TABLE public.widgets
  DROP CONSTRAINT IF EXISTS widgets_type_check;

ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('field_latest','field_average','field_total','correlator','tracker_latest','combined_field'));
