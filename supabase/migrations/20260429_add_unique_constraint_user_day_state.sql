-- Add UNIQUE constraint for user_day_state upsert operations
-- The constraint (user_id, date) allows upsert to work correctly with onConflict: 'user_id,date'
ALTER TABLE user_day_state
ADD CONSTRAINT user_day_state_user_id_date_unique UNIQUE (user_id, date);
