-- Add ON DELETE CASCADE to tracker_logs.tracker_id
ALTER TABLE public.tracker_logs
DROP CONSTRAINT IF EXISTS tracker_logs_tracker_id_fkey;

ALTER TABLE public.tracker_logs
ADD CONSTRAINT tracker_logs_tracker_id_fkey
FOREIGN KEY (tracker_id)
REFERENCES public.trackers(id)
ON DELETE CASCADE;
