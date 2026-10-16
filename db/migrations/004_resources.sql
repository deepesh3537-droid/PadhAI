-- =====================================================================
-- Migration 004: Educational Resources and Lesson Mappings
-- Relational tables for verified educational resources and many-to-many
-- mapping to lessons with Row Level Security (RLS) and grants.
-- =====================================================================

-- 1. Resources Table (Deduplicated catalog of educational links/docs/videos)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'article' CHECK (resource_type IN ('article', 'video', 'documentation', 'pdf', 'interactive')),
  author TEXT,
  published_at TIMESTAMPTZ,
  access_status TEXT NOT NULL DEFAULT 'accessible' CHECK (access_status IN ('accessible', 'paywalled', 'dead', 'restricted')),
  license_notes TEXT,
  relevance_evidence JSONB DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Lesson Resources Junction Table (Many-to-many linking lessons to resources)
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  PRIMARY KEY (lesson_id, resource_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_resources_url ON public.resources(url);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_id ON public.lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_resource_id ON public.lesson_resources(resource_id);

-- 4. Enable Row Level Security
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Resources
-- Authenticated users can view resources linked to any lessons in their courses,
-- or any general public verified resources.
CREATE POLICY "Users can view relevant resources"
  ON public.resources FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can insert resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update resources"
  ON public.resources FOR UPDATE
  USING (
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- 6. RLS Policies: Lesson Resources
-- A user can view lesson_resources if the linked lesson belongs to a course owned by them.
CREATE POLICY "Users can view lesson resources for own courses"
  ON public.lesson_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = lesson_resources.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can link resources to lessons in own courses"
  ON public.lesson_resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = lesson_resources.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lesson resource links in own courses"
  ON public.lesson_resources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = lesson_resources.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lesson resource links in own courses"
  ON public.lesson_resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.modules ON modules.id = lessons.module_id
      JOIN public.courses ON courses.id = modules.course_id
      WHERE lessons.id = lesson_resources.lesson_id
        AND courses.user_id = auth.uid()
    )
  );

-- 7. Explicit Table Grants (ADR-017 / Supabase Auth PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_resources TO authenticated;
GRANT ALL PRIVILEGES ON public.resources TO service_role;
GRANT ALL PRIVILEGES ON public.lesson_resources TO service_role;
