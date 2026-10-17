-- =====================================================================
-- Migration 006: Quizzes and Quiz Attempts
-- Relational tables for lesson quizzes, question schemas, and deterministic
-- attempt logging with Row Level Security (RLS) and table grants.
-- =====================================================================

-- 1. Quizzes Table (Stores AI-generated or authored quizzes tied to lessons)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Lesson Quiz',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Quiz Attempts Table (Logs learner responses, deterministic scores, and feedback)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC NOT NULL DEFAULT 0,
  feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Quizzes
-- Authenticated users can view quizzes for lessons in courses they own
CREATE POLICY "Users can view quizzes for own course lessons"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quizzes for own course lessons"
  ON public.quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quizzes for own course lessons"
  ON public.quizzes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
        AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quizzes for own course lessons"
  ON public.quizzes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

-- 6. RLS Policies: Quiz Attempts
-- Users strictly control and view their own attempts
CREATE POLICY "Users can view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz attempts"
  ON public.quiz_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz attempts"
  ON public.quiz_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Explicit Table Grants (ADR-017 / Supabase Auth PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL PRIVILEGES ON public.quizzes, public.quiz_attempts TO service_role;
