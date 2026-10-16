-- =====================================================================
-- Migration 002: Courses, Modules, and Lessons with Foreign Keys,
-- Indexes, and Row Level Security (RLS)
-- =====================================================================

-- 1. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal TEXT NOT NULL,
  target_depth TEXT NOT NULL CHECK (target_depth IN ('beginner', 'intermediate', 'advanced')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('draft', 'researching', 'ready', 'failed')),
  syllabus_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Modules Table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

-- 3. Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);

-- 5. Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Courses
CREATE POLICY "Users can view own courses"
  ON public.courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS Policies: Modules (via parent course ownership)
CREATE POLICY "Users can view own course modules"
  ON public.modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create modules in own courses"
  ON public.modules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update modules in own courses"
  ON public.modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete modules in own courses"
  ON public.modules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- 8. RLS Policies: Lessons (via grandparent course ownership)
CREATE POLICY "Users can view own lessons"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      JOIN public.courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lessons in own courses"
  ON public.lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules
      JOIN public.courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lessons in own courses"
  ON public.lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      JOIN public.courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lessons in own courses"
  ON public.lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      JOIN public.courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
        AND courses.user_id = auth.uid()
    )
  );
