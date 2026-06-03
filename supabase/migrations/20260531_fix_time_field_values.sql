-- Migration: Convert numeric seconds back to "HH:MM" strings for 'time' type fields
--
-- Context: The 20260531_time_to_duration_field.sql migration converted ALL 'time' schema
-- fields to 'duration' and their stored values from strings ("23:30") to seconds (84600).
-- However, time-of-day fields (Sleep Start, Sleep End) should NOT have been converted —
-- they are clock times, not elapsed durations.
--
-- After manually changing those fields back to type='time' in the schema editor, their
-- stored log values are now integers (seconds since midnight). This migration converts
-- those integers back to "HH:MM" strings so <input type="time"> displays them correctly.
--
-- Safe to run at any time — only affects fields where:
--   1. The tracker schema has type='time' for that fieldId
--   2. The stored JSON value is a number (not already a string)
--   3. The value is in the valid 0–86399 range (one day in seconds)

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

        -- Only convert values that are valid time-of-day seconds (0–86399)
        IF seconds_val >= 0 AND seconds_val < 86400 THEN
          -- Convert seconds since midnight → "HH:MM"
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
