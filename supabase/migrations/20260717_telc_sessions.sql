-- TELC session history table
-- Run once in: Supabase Dashboard → SQL Editor → New Query
-- Or via: npx supabase db push (after linking project with npx supabase link)

CREATE TABLE IF NOT EXISTS telc_sessions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_json JSONB      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user history retrieval
CREATE INDEX IF NOT EXISTS telc_sessions_user_id_created_at
  ON telc_sessions (user_id, created_at DESC);

-- Row Level Security: users can only see and modify their own sessions
ALTER TABLE telc_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions"
  ON telc_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own sessions"
  ON telc_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON telc_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON telc_sessions FOR DELETE
  USING (auth.uid() = user_id);
