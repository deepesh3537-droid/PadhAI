-- =====================================================================
-- Migration 007: Topic Mastery Tracking
-- Relational tracking of learner topic understanding with evidence counts,
-- recency history, Row Level Security (RLS), and table grants.
-- (PRD §6 F6, TEST_PLAN §7).
-- =====================================================================

-- 1. Topic Mastery Table (Independent from lesson completion)
CREATE TABLE IF NOT EXISTS public.topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (mastery_score >= 0.00 AND mastery_score <= 100.00),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, course_id, topic)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user_course
  ON public.topic_mastery(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_last_assessed
  ON public.topic_mastery(user_id, last_assessed_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Topic Mastery
-- Users can only view and mutate their own mastery data
CREATE POLICY "Users can view own topic mastery"
  ON public.topic_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic mastery"
  ON public.topic_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic mastery"
  ON public.topic_mastery FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic mastery"
  ON public.topic_mastery FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Explicit Table Grants (ADR-017 / Supabase Auth PostgREST access)
GRANT ALL ON TABLE public.topic_mastery TO authenticated, anon, service_role;

