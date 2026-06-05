CREATE TABLE feedback_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('very_helpful', 'helpful_needs_work', 'not_helpful')),
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
ON feedback_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
ON feedback_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX feedback_responses_user_id_idx ON feedback_responses(user_id);
CREATE INDEX feedback_responses_created_at_idx ON feedback_responses(created_at DESC);
