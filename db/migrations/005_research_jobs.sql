-- =====================================================================
-- Migration 005: Durable Research Jobs for Asynchronous Educational
-- Resource Discovery with Status Tracking and Concurrency Control
-- =====================================================================

-- 1. Research Jobs Table
CREATE TABLE IF NOT EXISTS public.research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'researching', 'completed', 'failed')),
  current_step TEXT NOT NULL DEFAULT 'pending',
  progress JSONB NOT NULL DEFAULT '{"totalLessons": 0, "processedLessons": 0, "discoveredCount": 0, "verifiedCount": 0}'::jsonb,
  safe_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance and Query Indexes
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_id ON public.research_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_course_id ON public.research_jobs(course_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON public.research_jobs(status);

-- 3. Concurrency Constraint:
-- Enforces that a course can have at most ONE active job ('queued' or 'researching') at any time.
-- Completed and failed jobs are preserved in the table for history and auditability.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_research_job_per_course
  ON public.research_jobs (course_id)
  WHERE status IN ('queued', 'researching');

-- 4. Enable Row Level Security
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Research Jobs
-- Users can view and manage research jobs strictly for courses they own
CREATE POLICY "Users can view own research jobs"
  ON public.research_jobs FOR SELECT
  USING (
    auth.uid() = user_id
  );

CREATE POLICY "Users can create own research jobs"
  ON public.research_jobs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = research_jobs.course_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own research jobs"
  ON public.research_jobs FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- 6. Explicit Table Grants (ADR-017 / Supabase Auth PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_jobs TO authenticated;
GRANT ALL PRIVILEGES ON public.research_jobs TO service_role;
