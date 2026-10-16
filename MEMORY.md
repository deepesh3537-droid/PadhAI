# MEMORY — Current Project State

> Update this file at the end of every work session and after every completed task.
> `MEMORY.md` = current state · `DECISIONS.md` = permanent decisions.
> AI assistants: read this file **after** `PRD.md`, `ARCHITECTURE.md`, and `RULES.md`, before writing any code.

**Last updated:** 2026-10-16

---

## Current Status

Prerequisites verified (Node.js v24.13.1, npm 11.8.0, Git 2.56.0). Root structure aligned with `ARCHITECTURE.md` §3 and folder skeleton created.

## Completed

- [x] Product planning (`PROJECT_CONTEXT.md`)
- [x] PRD.md
- [x] ARCHITECTURE.md (including folder structure)
- [x] DESIGN.md
- [x] RULES.md
- [x] TASKS.md
- [x] DECISIONS.md
- [x] MEMORY.md
- [x] TEST_PLAN.md
- [x] SECURITY.md
- [x] README.md
- [x] .env.example
- [x] **TASK-001**: Verify Node.js LTS, npm, and Git.
- [x] **TASK-002**: Record hardware (RAM, GPU model, VRAM, OS) in `docs/model-benchmarks.md`.
- [x] **TASK-003**: Install Ollama; verify service and GPU utilization (CUDA 12.7, GTX 1650).
- [x] **TASK-004**: Pull candidate model `qwen3:0.6b` (522 MB).
- [x] **TASK-005**: Check model card and Apache 2.0 license.
- [x] **TASK-006**: Benchmark 20 outline prompts (130.4 t/s, 100% valid JSON, < 1 GB VRAM).
- [x] **TASK-007**: Decide model (`qwen3:0.6b` accepted in ADR-004).
- [x] **TASK-008**: Supabase project created (`https://xhargblmtxlwksrypmzb.supabase.co`).
- [x] **TASK-009**: Project opened and operational in Google Antigravity.
- [x] **TASK-010**: `.gitignore` setup.
- [x] **TASK-011**: Directory skeleton (`client/`, `server/`, `db/`, `docs/`).
- [x] **TASK-012**: Scaffold `client/` with React + Vite and verify build.
- [x] **TASK-013**: Scaffold `server/` with Express dependencies.
- [x] **TASK-014**: Validate environment variables with Zod (`env.js`).
- [x] **TASK-015**: Implement `GET /api/health` and centralized `errorHandler` (verified via `node:test`).
- [x] **TASK-017**: Migration `001_profiles.sql` (profile table, automatic sign-up trigger, and RLS).
- [x] **TASK-018**: Client auth layer (`supabaseClient.js`, `apiClient.js`, `AuthContext.jsx`, `LoginPage.jsx`, `DashboardPage.jsx`).
- [x] **TASK-019**: Server JWT verification middleware (`auth.js` verified with unit tests).
- [x] **TASK-020**: Protected `GET /api/me` implemented and verified end-to-end.
- [x] **TASK-022**: Migration `002_courses_modules_lessons.sql` with foreign keys, indexes, and RLS.
- [x] **TASK-023**: `outline.schema.js` curriculum schema with Zod.
- [x] **TASK-024**: `outline.prompt.js` with structured generation and repair prompt builder.
- [x] **TASK-025**: `config/limits.js` centralized budgets, timeouts, and limits.
- [x] **TASK-026**: `modelAdapter.js` + `ollamaAdapter.js` with markdown fence stripping and bounded repair retries.
- [x] **TASK-027**: Unit tests for modelAdapter covering first-attempt parse, code fences, repair retries, and invalid output.
- [x] **TASK-028**: `course.repository.js` + `course.service.js` for atomic multi-table persistence and retrieval.
- [x] **TASK-029**: `POST /api/courses` with JWT authentication, Zod validation, and rate limiting.
- [x] **TASK-030**: `GET /api/courses` and `GET /api/courses/:id` owner-scoped endpoints.
- [x] **TASK-031**: `NewCoursePage.jsx` with input bounds, loading state, and error banner.
- [x] **TASK-032**: `DashboardPage.jsx` with dynamic course loading, empty/loading/error states, course cards, and `App.jsx` client routing to `CoursePage.jsx`.
- [x] **TASK-033**: Automated Milestone 1 verification suite (20 tests covering schema validation, malformed output recovery, service input bounds, 401 auth guards, Ollama connection/service error handling, and client secret bundle checks).
- [x] **TASK-034**: Collapsible module/lesson hierarchy UI with Expand/Collapse All and lesson counts in `CoursePage.jsx`.
- [x] **TASK-035**: `LessonPage.jsx` workspace with boundary-aware previous/next navigation and completed state indicators.
- [x] **TASK-036**: Migration `003_lesson_progress.sql` and idempotent `POST /api/lessons/:id/complete` endpoint.
- [x] **TASK-037**: Course progress bar (`ProgressBar.jsx`) integrated in course overview and `GET /api/courses/:id/progress` endpoint.
- [x] **TASK-038**: Unit and route tests for progress calculation and authentication guards (25 passing tests).
- [x] **TASK-039**: Search provider decision recorded in `DECISIONS.md` as ADR-018 (SearXNG self-hosted/local metasearch).
- [x] **TASK-040**: Migration `004_resources.sql` for `resources` and `lesson_resources` with indexes, RLS, and grants.
- [x] **TASK-041**: `research/providers/searxng.js` with timeout, quota handling, and graceful fallback.
- [x] **TASK-042**: `utils/urlUtils.js` for URL normalization, tracking param removal, and deduplication.
- [x] **TASK-043**: `utils/safeLinkChecker.js` with SSRF protection (private/loopback/metadata IP blocks), timeouts, and size caps.
- [x] **TASK-044**: `research/relevanceFilter.js` with lexical keyword scoring and untrusted text enveloping.
- [x] **TASK-045**: `GET /api/lessons/:id/resources` route and `LessonPage.jsx` rendering resources with source metadata.
- [x] **TASK-046**: Automated TEST_PLAN §5 test suite in `resourceDiscovery.test.js` (35 passing tests across the server).

- [x] **TASK-047**: `VideoEmbed.jsx` with YouTube IFrame Player embed URL parsing, aspect ratio maintenance, and fallback card.
- [x] **TASK-048**: `FallbackLinkCard.jsx` for non-embeddable sites with secure `rel="noopener noreferrer"`.
- [x] **TASK-049**: PDF viewing indicators and link-out support in `FallbackLinkCard.jsx`.
- [x] **TASK-050**: Lesson progress percentage and completed checks in `LessonPage.jsx`.
- [x] **TASK-051**: Responsive media queries for 375px / 768px / 1440px with touch target sizing and accessibility focus rings.

## Current Task

**Phase 5 Completed**. Next up: **Phase 6 — Quizzes** (`TASK-052` through `TASK-058`).

## Environment Facts

| Item | Value |
|---|---|
| OS | Windows 11 Home Single Language (64-bit, Build 10.0.26200) |
| Node.js / npm | v24.13.1 / 11.8.0 |
| Git | 2.56.0.windows.1 |
| RAM | 8 GB (7.42 GB visible) |
| Dedicated GPU | NVIDIA GeForce GTX 1650 (Driver 566.07, CUDA 12.7) |
| Dedicated VRAM | 4096 MiB (4 GB) |
| Integrated GPU | AMD Radeon(TM) Graphics (512 MB) |
| Dev environment | Google Antigravity |
| Language | JavaScript (ES modules) |
| Database/Auth | Supabase (`https://xhargblmtxlwksrypmzb.supabase.co`) |
| Model | `qwen3:0.6b` — **Accepted** (ADR-004) |
| Search provider | SearXNG — **Accepted** (ADR-018) |
| Hosting | Not chosen (Phase 10) |

## Known Issues

- None.

## Open Questions

See the open-decisions table in `DECISIONS.md`.

## Next Step

Proceed to **Phase 6 — Quizzes**:
1. **TASK-052**: Migrations for `quizzes` and `quiz_attempts` + RLS policies and table grants.
2. **TASK-053**: Quiz schema (`quiz.schema.js`) with answer-key validation.
3. **TASK-054**: Quiz prompt builder & generation with repair prompt.
4. **TASK-055**: Endpoints `GET /api/lessons/:id/quiz` (answer keys stripped) and `POST /api/quizzes/:id/attempts`.
5. **TASK-056**: Deterministic scoring service in `quiz.service.js` with unit tests.
6. **TASK-057**: Quiz UI, feedback panel, attempt history on lesson workspace.
7. **TASK-058**: Run TEST_PLAN §6.

## Session Log

| Date | What happened |
|---|---|
| 2026-10-16 | Created all planning documents. Chose JavaScript, Supabase, course-first tutor. |
| 2026-10-16 | Completed TASK-001 (Node v24.13.1, Git 2.56.0 verified). Completed TASK-010 (.gitignore) and TASK-011 (folder skeleton per ARCHITECTURE.md §3). |
| 2026-10-17 | Resolved 'permission denied for table courses' via Option B (ADR-017): implemented user-scoped Supabase client forwarding JWTs to PostgREST to execute queries under `authenticated` role and evaluate RLS. |
| 2026-10-17 | Completed Phase 4 (TASK-039 through TASK-046): ADR-018 SearXNG, Migration 004, URL normalization, SSRF protection, relevance filtering, untrusted text wrapper, resource repository & API, LessonPage UI with metadata, and 35 automated tests. |
| 2026-10-17 | Completed Phase 5 (TASK-047 through TASK-051): `VideoEmbed.jsx`, `FallbackLinkCard.jsx`, PDF indicators, overall lesson progress percentage, and mobile responsive layout passes at 375px/768px/1440px. |


