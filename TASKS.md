# TASKS — Implementation Plan

> Never build the whole app in one prompt. Work one task at a time:
>
> `TASK-001 → Implement → Test → Review → Mark complete → Update MEMORY.md → TASK-002`
>
> Legend: `[ ]` todo · `[~]` in progress · `[x]` done
> Verification steps come from `TEST_PLAN.md`. Decisions go in `DECISIONS.md`.

---

## Phase 0 — Prerequisites and benchmarking

- [x] **TASK-001** Install Node.js LTS and Git; confirm versions.
- [x] **TASK-002** Record hardware (RAM, GPU model, VRAM, OS) in `docs/model-benchmarks.md`.
- [x] **TASK-003** Install Ollama; verify it runs and whether it uses the GPU.
- [x] **TASK-004** Pull the candidate model (verify the exact tag on the Ollama library).
- [x] **TASK-005** Check the model card: exact version, license, commercial-use terms; record them.
- [x] **TASK-006** Benchmark ~20 outline prompts: tokens/sec, RAM/VRAM, JSON validity rate, quality (TEST_PLAN §13).
- [x] **TASK-007** Decide model (keep, or try a larger quantized one); update ADR-004.
- [x] **TASK-008** Create the free Supabase project; confirm no credit card needed; note free-tier limits and pause behavior.
- [x] **TASK-009** Open the project in Google Antigravity.

**Exit check:** `docs/model-benchmarks.md` complete; model chosen provisionally; Supabase project exists.

---

## Phase 1 — Project foundation

- [x] **TASK-010** `git init`; add `.gitignore` (node_modules, .env, dist).
- [x] **TASK-011** Create folder skeleton per `ARCHITECTURE.md` §3.
- [x] **TASK-012** Scaffold `client/` with React + Vite (JavaScript); run the dev server.
- [x] **TASK-013** Scaffold `server/` (`"type": "module"`); install `express cors helmet dotenv zod express-rate-limit @supabase/supabase-js`.
- [x] **TASK-014** `server/src/config/env.js`: validate env vars with Zod; fail fast.
- [x] **TASK-015** `GET /api/health`; add error handler middleware.
- [x] **TASK-016** Create real `.env` files from `.env.example`; verify they are git-ignored.
- [x] **TASK-017** Migration `001_profiles.sql` (profile on sign-up + RLS); apply in Supabase.
- [x] **TASK-018** Client: Supabase client, `AuthContext`, sign-up/login pages, protected routes.
- [x] **TASK-019** Server: `auth.js` JWT-verification middleware.
- [x] **TASK-020** Protected `GET /api/me` and a basic Dashboard that calls it.
- [ ] **TASK-021** Two-account isolation check (TEST_PLAN §1, §3).

**Exit check:** Auth works end-to-end; 401 without token; accounts isolated.

---

## Phase 2 — First AI vertical slice ⭐ Milestone 1

> Topic input → local model → schema-validated outline → PostgreSQL → React display.

- [ ] **TASK-022** Migration `002_courses_modules_lessons.sql` with FKs, indexes, RLS.
- [ ] **TASK-023** `ai/schemas/outline.schema.js` (Zod).
- [ ] **TASK-024** `ai/prompts/outline.prompt.js` (topic, goal, depth).
- [ ] **TASK-025** `config/limits.js` (max tokens, retries, timeouts).
- [ ] **TASK-026** `ai/modelAdapter.js` + `ollamaAdapter.js` with parse → validate → bounded repair retry.
- [ ] **TASK-027** Unit tests for the adapter with malformed/partial/invalid output (mocked).
- [ ] **TASK-028** Repository + service: atomic save of course/modules/lessons.
- [ ] **TASK-029** `POST /api/courses` (auth, Zod validation, rate limit).
- [ ] **TASK-030** `GET /api/courses` and `GET /api/courses/:id` (owner-only).
- [ ] **TASK-031** Client `NewCoursePage` with loading/error states.
- [ ] **TASK-032** Client `CoursePage` showing the saved outline; dashboard lists courses.
- [ ] **TASK-033** Run all TEST_PLAN §2 checks, plus cross-user access (§3).

**Exit check (Milestone 1):** A learner enters a goal, gets a valid outline from the local model, and retrieves it later. All failure tests pass.

---

## Phase 3 — Structured courses

- [ ] **TASK-034** Collapsible module/lesson hierarchy UI.
- [ ] **TASK-035** `LessonPage` with prev/next navigation.
- [ ] **TASK-036** Migration for `lesson_progress`; `POST /api/lessons/:id/complete` (idempotent).
- [ ] **TASK-037** Course progress bar.
- [ ] **TASK-038** Run TEST_PLAN §4.

---

## Phase 4 — Basic resource discovery

- [ ] **TASK-039** Choose search provider after verifying current free terms/quotas/ToS → new ADR.
- [ ] **TASK-040** Migrations for `resources` and `lesson_resources`.
- [ ] **TASK-041** `research/providers/<provider>.js` with quota handling.
- [ ] **TASK-042** URL normalization and deduplication.
- [ ] **TASK-043** Safe link checker (SSRF protections, timeouts, size caps).
- [ ] **TASK-044** Basic relevance filter; wrap retrieved text as untrusted.
- [ ] **TASK-045** Show resources per lesson with source metadata.
- [ ] **TASK-046** Run TEST_PLAN §5 (non-embed parts).

---

## Phase 5 — Learning interface

- [ ] **TASK-047** `VideoEmbed` with the YouTube IFrame Player API + fallback card.
- [ ] **TASK-048** Fallback link cards for non-embeddable sites.
- [ ] **TASK-049** PDF viewing only where permitted; otherwise link out.
- [ ] **TASK-050** Lesson progress indicators.
- [ ] **TASK-051** Responsive pass at 375 / 768 / 1440px (TEST_PLAN §12).

---

## Phase 6 — Quizzes

- [ ] **TASK-052** Migrations for `quizzes` and `quiz_attempts` + RLS.
- [ ] **TASK-053** Quiz schema with answer-key validation.
- [ ] **TASK-054** Quiz prompt + generation; validate before saving.
- [ ] **TASK-055** `GET /api/lessons/:id/quiz` (no keys) and `POST /api/quizzes/:id/attempts`.
- [ ] **TASK-056** Deterministic scoring in `quiz.service.js` with unit tests.
- [ ] **TASK-057** Quiz UI, feedback panel, attempt history.
- [ ] **TASK-058** Run TEST_PLAN §6.

---

## Phase 7 — Learner profile, mastery, tutor

- [ ] **TASK-059** Migration for `topic_mastery`.
- [ ] **TASK-060** `mastery.service.js` (documented formula) with unit tests.
- [ ] **TASK-061** Mastery UI with evidence count and uncertainty wording.
- [ ] **TASK-062** Revision recommendations from evidence.
- [ ] **TASK-063** SQL retrieval of lesson, outline, attempts, mastery for the tutor.
- [ ] **TASK-064** `POST /api/tutor/messages` (course-first, labeled fallback, sources).
- [ ] **TASK-065** Tutor panel UI.
- [ ] **TASK-066** Run TEST_PLAN §7–8.

---

## Phase 8 — Research orchestration

- [ ] **TASK-067** Migration for `research_jobs`.
- [ ] **TASK-068** `POST /api/courses/:id/research` and `GET /api/jobs/:id`.
- [ ] **TASK-069** `research/pipeline.js` as plain functions with bounded steps.
- [ ] **TASK-070** `research/worker.js`; persisted status transitions.
- [ ] **TASK-071** Coverage check + limited follow-up searches; mark gaps honestly.
- [ ] **TASK-072** Bounded retries and recovery of interrupted jobs.
- [ ] **TASK-073** Prompt-injection tests with hostile page content.
- [ ] **TASK-074** Evaluate whether LangGraph.js is justified → ADR either way.
- [ ] **TASK-075** Run TEST_PLAN §9.

---

## Phase 9 — Syllabus upload

- [ ] **TASK-076** Decide formats and max size → ADR.
- [ ] **TASK-077** Upload endpoint with validation (SECURITY §9).
- [ ] **TASK-078** Text extraction; explicit handling of unreadable files.
- [ ] **TASK-079** Preserve syllabus structure; flag ambiguities; never invent topics.
- [ ] **TASK-080** Generate a course from the extracted syllabus.
- [ ] **TASK-081** Run TEST_PLAN §10.

---

## Phase 10 — Deployment and validation

- [ ] **TASK-082** Re-verify free-tier limits for every chosen host/provider.
- [ ] **TASK-083** Decide online inference under ₹0 (or document the limit) → ADR.
- [ ] **TASK-084** Deploy to infrastructure that supports API + worker.
- [ ] **TASK-085** Complete the SECURITY §12 checklist.
- [ ] **TASK-086** Run TEST_PLAN §14 from another device and account.
- [ ] **TASK-087** Document real limitations in README.

---

## Backlog

- [ ] Course editing
- [ ] Time constraints and learning-style preferences in generation
- [ ] Source-quality scoring method
- [ ] Account deletion and data-retention implementation
- [ ] Dark mode
- [ ] Vector search — **only** if SQL retrieval proves insufficient

---

## After each task

1. Run the relevant TEST_PLAN checks.
2. Tick the box above.
3. Update `MEMORY.md` (current task, status, known issues).
4. Add an ADR in `DECISIONS.md` if a decision was made.
