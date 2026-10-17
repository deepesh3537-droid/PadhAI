-- =====================================================================
-- Migration 008: AI Tutor Conversation Persistence
-- Persists learner questions and AI tutor responses across sessions
-- with lesson context, citations, and fallback labeling.
-- (PRD §6 F8, ARCHITECTURE §9, TEST_PLAN §8).
-- =====================================================================

-- 1. Tutor Messages Table
CREATE TABLE IF NOT EXISTS public.tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  beyond_course BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tutor_messages_user_lesson
  ON public.tutor_messages(user_id, lesson_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_user_course
  ON public.tutor_messages(user_id, course_id, created_at ASC);

-- 3. Enable Row Level Security
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Tutor Messages
-- Users can only view and insert their own messages
CREATE POLICY "Users can view own tutor messages"
  ON public.tutor_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tutor messages"
  ON public.tutor_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tutor messages"
  ON public.tutor_messages FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Explicit Table Grants (ADR-017 / Supabase Auth PostgREST access)
GRANT ALL ON TABLE public.tutor_messages TO authenticated, anon, service_role;

