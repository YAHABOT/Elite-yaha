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
--   - String "HH:MM" → H*3600 + M*60   (clock-picker input, user intended HH:MM as duration)
--   - String "HH:MM:SS" → H*3600+M*60+S
--   - Number (decimal hours from AI) → ROUND(value * 3600)
--   - Invalid / unparseable values → NULL (user can re-log)

-- ── Step 1: Update tracker schemas ─────────────────────────────────────────────
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

-- ── Step 2: Convert existing log values to seconds ─────────────────────────────
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
          -- Decimal hours → seconds (AI format)
          -- Guard: reject values that don't look like real durations
          IF decimal_hrs >= 0 AND decimal_hrs <= 24 THEN
            new_seconds := ROUND(decimal_hrs * 3600)::INTEGER;
          END IF;
        EXCEPTION WHEN others THEN
          -- Not a plain number — try string formats below
          new_seconds := NULL;
        END;

        -- If it parsed as a float but looks like it could be a string time format, re-check
        -- A string like "02:12" will fail ::FLOAT cast → handled by string parsing below
        IF new_seconds IS NULL THEN
          -- Try HH:MM:SS
          IF raw_val ~ '^\d{1,2}:\d{2}:\d{2}$' THEN
            parts := string_to_array(raw_val, ':');
            h := parts[1]::INTEGER;
            m := parts[2]::INTEGER;
            s := parts[3]::INTEGER;
            new_seconds := h * 3600 + m * 60 + s;
          -- Try HH:MM (from old <input type="time"> — user entered hours:minutes as duration)
          ELSIF raw_val ~ '^\d{1,2}:\d{2}$' THEN
            parts := string_to_array(raw_val, ':');
            h := parts[1]::INTEGER;
            m := parts[2]::INTEGER;
            new_seconds := h * 3600 + m * 60;
          END IF;
        END IF;

        -- Sanity check: reject values outside 0–24h range
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
