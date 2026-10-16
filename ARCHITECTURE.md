# ARCHITECTURE — AI-Powered Personalized Learning Platform

> Proposed architecture, subject to validation at each milestone. Items marked **[Assumption]** are reversible defaults; **[Confirmed]** are decided.

---

## 1. Overview

```
┌──────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│  React + Vite (SPA)  │ ───────────────────────► │  Express.js API (Node)    │
│  client/             │ ◄─────────────────────── │  server/                  │
└─────────┬────────────┘                          │  - validation (Zod)       │
          │ Supabase Auth (JWT)                   │  - auth middleware        │
          ▼                                       │  - rate limiting          │
┌──────────────────────┐   JWT verified / SQL     │  - services / AI layer    │
│ Supabase             │ ◄─────────────────────── │  - research worker        │
│ Auth + PostgreSQL    │                          └──────────┬────────────────┘
│ (RLS enabled)        │                                     │ HTTP (localhost)
└──────────────────────┘                                     ▼
                                                  ┌───────────────────────────┐
                                                  │ Ollama → small local model│
                                                  └───────────────────────────┘
```

**Rule:** The frontend never calls the model or search providers directly and never holds secret keys.

## 2. Confirmed Stack

| Layer | Choice | Status |
|---|---|---|
| Frontend | React + Vite | Confirmed |
| Language | **JavaScript (ES modules)**, JSDoc where helpful | Confirmed |
| Backend | Node.js + Express.js | Confirmed |
| DB / Auth | PostgreSQL via Supabase (Auth + RLS) | Confirmed |
| Validation | Zod (works in plain JS; used for all model output and requests) | **[Assumption]** |
| Model runtime | Ollama | Confirmed |
| Model | Qwen3-0.6B (benchmark candidate) | Not final |
| Styling | Tailwind CSS | **[Assumption]** optional |
| Orchestration | Plain functions first; LangChain.js / LangGraph.js later if justified | Confirmed approach |
| Video | Official YouTube IFrame Player API | Confirmed |

Because the project is JavaScript, **Zod schemas are the safety net** that TypeScript would otherwise provide. Every model output and request body must pass a schema before use.

## 3. Folder Structure

Monorepo with two independent packages (no workspaces tooling needed initially).

```
learning-platform/
├── README.md
├── PRD.md
├── ARCHITECTURE.md
├── DESIGN.md
├── RULES.md
├── TASKS.md
├── DECISIONS.md                  # permanent technical decisions (ADRs)
├── MEMORY.md                     # current project state
├── TEST_PLAN.md
├── SECURITY.md
├── .env.example                  # template only; real .env is git-ignored
├── .gitignore
│
├── client/                       # React + Vite SPA
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env.example              # VITE_ vars (public only)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── routes/               # route-level pages
│       │   ├── LoginPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── NewCoursePage.jsx
│       │   ├── CoursePage.jsx
│       │   ├── LessonPage.jsx
│       │   └── NotFoundPage.jsx
│       ├── components/
│       │   ├── layout/           # AppShell, Navbar, Sidebar
│       │   ├── course/           # CourseOutline, ModuleCard, LessonItem
│       │   ├── lesson/           # VideoEmbed, ResourceList, LessonHeader
│       │   ├── quiz/             # QuizRunner, QuestionCard, FeedbackPanel
│       │   ├── tutor/            # TutorPanel, MessageBubble
│       │   └── ui/               # Button, Card, Spinner, ErrorBanner, ProgressBar
│       ├── hooks/                # useAuth, useCourse, useJobStatus
│       ├── lib/
│       │   ├── supabaseClient.js # anon key only
│       │   ├── apiClient.js      # fetch wrapper that attaches JWT
│       │   └── youtube.js        # IFrame API loader
│       ├── context/              # AuthContext
│       └── styles/
│           └── index.css
│
├── server/                       # Express API + AI + worker
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js              # boot: load env, start server
│       ├── app.js                # express app (exported for tests)
│       ├── config/
│       │   ├── env.js            # validates env vars with Zod, fails fast
│       │   └── limits.js         # central budgets: tokens, retries, pages, timeouts
│       ├── middleware/
│       │   ├── auth.js           # verify Supabase JWT → req.user
│       │   ├── validate.js       # Zod request validation
│       │   ├── rateLimit.js
│       │   └── errorHandler.js   # safe error responses
│       ├── routes/
│       │   ├── health.routes.js
│       │   ├── courses.routes.js
│       │   ├── lessons.routes.js
│       │   ├── quizzes.routes.js
│       │   ├── tutor.routes.js
│       │   └── jobs.routes.js
│       ├── controllers/          # thin: parse → service → respond
│       ├── services/             # business logic (no Express types)
│       │   ├── course.service.js
│       │   ├── progress.service.js
│       │   ├── quiz.service.js   # deterministic scoring
│       │   ├── mastery.service.js# transparent mastery estimation
│       │   └── tutor.service.js
│       ├── ai/
│       │   ├── modelAdapter.js   # interface: generate(prompt, schema) → validated JSON
│       │   ├── ollamaAdapter.js  # first implementation
│       │   ├── prompts/          # prompt templates as plain modules
│       │   │   ├── outline.prompt.js
│       │   │   ├── quiz.prompt.js
│       │   │   └── tutor.prompt.js
│       │   ├── schemas/          # Zod schemas for every AI output
│       │   │   ├── outline.schema.js
│       │   │   └── quiz.schema.js
│       │   └── safety/
│       │       └── untrusted.js  # wrap/sanitize retrieved content
│       ├── research/             # added in Phase 4+
│       │   ├── pipeline.js       # explicit ordered steps
│       │   ├── providers/        # one file per search source
│       │   ├── evaluate.js       # relevance/credibility/accessibility
│       │   ├── coverage.js       # objective ↔ resource mapping, gaps
│       │   └── worker.js         # polls queued jobs, runs bounded pipeline
│       ├── db/
│       │   ├── supabaseAdmin.js  # service-role client (server only)
│       │   └── repositories/     # all SQL/queries live here
│       └── utils/
│           ├── logger.js
│           ├── retry.js          # bounded retry with backoff
│           └── errors.js         # AppError types
│   └── tests/
│       ├── ai/                   # schema + malformed-output tests
│       ├── services/
│       └── routes/
│
├── db/
│   ├── migrations/               # ordered .sql files (source of truth for schema)
│   │   ├── 001_profiles.sql
│   │   ├── 002_courses_modules_lessons.sql
│   │   ├── 003_rls_policies.sql
│   │   └── ...
│   └── seed/                     # optional dev seed data
│
└── docs/
    ├── model-benchmarks.md       # Task 0 results: speed, RAM/VRAM, quality, license
    └── decisions/                # short ADRs for resolved open decisions
```

**Conventions:** controllers are thin; services hold logic; repositories own DB access; `ai/` is the only place that talks to the model; `research/` is the only place that talks to search providers.

### Architectural Rules

1. UI components must not contain database logic or call Supabase for protected data writes.
2. Database access happens only in `server/src/db/repositories/`.
3. Business logic lives in `services/`; controllers stay thin; services never import Express types.
4. Authentication is verified **server-side** on every protected request.
5. Only `server/src/ai/` talks to the model; only `server/src/research/` talks to search providers.
6. Every AI output is validated with a Zod schema before use or storage.
7. Reusable UI belongs in `client/src/components/`; pages only compose components.
8. All server calls from the client go through `lib/apiClient.js`.
9. Limits (tokens, retries, pages, timeouts) are defined only in `config/limits.js`.
10. Schema changes are numbered SQL migrations; never edit an applied migration.
11. No new infrastructure (queues, vector DB, microservices) without an ADR in `DECISIONS.md`.

### Request flow

```
User → React UI → apiClient (JWT) → Express route → auth + validation middleware
     → controller → service → repository → Supabase PostgreSQL
                         └──→ ai/modelAdapter → Ollama
```

## 4. Data Model (starting point — not final)

Relational for core entities; JSONB only for flexible model output. All user-owned tables carry `user_id` (directly or via parent) and have RLS.

```
profiles(id → auth.users, display_name, preferences jsonb, created_at, updated_at)

courses(id, user_id, title, description, goal, target_depth, status, syllabus_meta jsonb, created_at, updated_at)
modules(id, course_id, title, description, position)
lessons(id, module_id, title, objectives jsonb, summary, position, metadata jsonb)

resources(id, url, title, resource_type, author, published_at,
          access_status, license_notes, relevance_evidence jsonb, verification_status)
lesson_resources(lesson_id, resource_id, rank, note)       -- many-to-many

lesson_progress(user_id, lesson_id, completed_at)          -- completion
quizzes(id, lesson_id|module_id, questions jsonb, version, objective_id?)
quiz_attempts(id, user_id, quiz_id, answers jsonb, score, feedback jsonb, created_at)

topic_mastery(id, user_id, topic_key, mastery_estimate, evidence_count,
              last_assessed_at, evidence jsonb)            -- separate from completion

research_jobs(id, user_id, course_id, status, current_step, progress,
              safe_error, created_at, updated_at)
```

- `status` enum for jobs: `queued → researching → validating → generating_course → completed | failed`.
- Indexes on every foreign key and on `(user_id, course_id)`-style lookups.
- **Completion (`lesson_progress`) and mastery (`topic_mastery`) are separate on purpose.**
- Quiz answer keys are not exposed to the client before submission.
- Define retention and account-deletion (`ON DELETE CASCADE` from `auth.users`) before production.

## 5. Security Model

1. Client signs in with **Supabase Auth** and receives a JWT.
2. Client sends `Authorization: Bearer <jwt>` to Express.
3. `auth.js` middleware verifies the token and sets `req.user.id`.
4. Services always filter by `req.user.id`; never trust a `userId` from the body.
5. **RLS policies** on every user table as defence in depth.
6. The **service-role key lives only on the server** and is used sparingly; prefer user-scoped queries.
7. Rate limiting per user/IP on AI and research endpoints.
8. Errors returned to clients are safe summaries; details are logged server-side.
9. `.env` is never committed; the frontend only sees `VITE_`-prefixed public values.

## 6. AI Layer

### Model adapter (replaceable)

```js
// server/src/ai/modelAdapter.js — conceptual contract
// generateStructured({ prompt, schema, options }) → Promise<validatedObject>
// - calls the runtime (Ollama first)
// - parses JSON, validates with the Zod schema
// - bounded retry (e.g., 2) with a "fix your JSON" repair prompt
// - throws AppError('AI_INVALID_OUTPUT') after limits are exhausted
```

Swapping Ollama for another runtime means writing one new adapter file.

### Outline generation (first vertical slice)

1. Controller validates `{ topic, goal, depth }`.
2. `course.service` builds the prompt from `outline.prompt.js`.
3. `ollamaAdapter` returns JSON validated by `outline.schema.js`.
4. Service saves course → modules → lessons in one transaction (via repository/RPC).
5. Response returns the saved course.

### Model selection
Qwen3-0.6B is only a starting candidate. Before adoption, record in `docs/model-benchmarks.md`: exact version, license, RAM/VRAM use, tokens/sec, JSON validity rate over ~20 prompts, and output quality. Hardware has a GPU, but its model and VRAM must be recorded first. If the 0.6B model fails quality checks, test a slightly larger quantized model within the hardware limit.

### Deterministic work stays out of the LLM
Quiz scoring, ownership checks, CRUD, field validation, rate limiting.

### Untrusted content
Retrieved web pages are untrusted data. They are delimited and passed to the model as data only; embedded instructions are ignored, and model output cannot trigger actions (no tool calls driven by page content).

## 7. API Surface (initial)

| Method | Path | Purpose | Phase |
|---|---|---|---|
| GET | `/api/health` | Liveness | 1 |
| POST | `/api/courses` | Generate + save outline from `{topic, goal, depth}` | 2 |
| GET | `/api/courses` | List my courses | 2 |
| GET | `/api/courses/:id` | Course with modules/lessons | 2–3 |
| POST | `/api/lessons/:id/complete` | Mark lesson complete | 3 |
| POST | `/api/courses/:id/research` | Create research job | 8 |
| GET | `/api/jobs/:id` | Poll job status | 8 |
| GET | `/api/lessons/:id/quiz` | Quiz without answer keys | 6 |
| POST | `/api/quizzes/:id/attempts` | Submit answers; deterministic score | 6 |
| GET | `/api/me/mastery` | Mastery estimates + evidence | 7 |
| POST | `/api/tutor/messages` | Tutor reply (course-first, flagged fallback) | 7 |

Error format: `{ "error": { "code": "AI_INVALID_OUTPUT", "message": "…safe message…" } }`.

## 8. Research Pipeline (Phase 4+, explicit sequence)

```
parse request → topic map → plan research (limits) → discover →
evaluate evidence → check coverage → (bounded follow-up) →
generate curriculum → generate assessments → persist → update personalization
```

- Implemented as plain functions in `research/pipeline.js`.
- Limits are centralized in `config/limits.js`: search rounds, results/topic, pages, document size, tokens, retries, runtime.
- Job lifecycle persisted in `research_jobs`; frontend polls `/api/jobs/:id`.
- Failure handling: provider failure, quota exhaustion, dead links, invalid model output, partial research, DB errors, interruptions — each yields a persisted state and user-readable message.
- Never claim full verification when topics are unsupported; mark coverage gaps.
- **LangGraph.js is introduced only if** branching/checkpointing becomes too painful with plain functions.

## 9. Tutor Design

- Retrieval is **SQL-based first** (current lesson, course outline, recent attempts, mastery rows). No vector DB unless a demonstrated need appears.
- Prompt includes retrieved context with source references.
- Answers prefer course sources and cite lesson/resource. If the answer goes beyond them, the response is labeled (e.g., "Beyond your course materials: …").
- Saved context lives in the DB, not in model memory.

## 10. Mastery Estimation (transparent initial method)

Per `(user, topic_key)`:
- Evidence = quiz question results mapped to the objective/topic.
- Estimate = recency-weighted correctness (e.g., exponential decay), stored with `evidence_count`.
- Display confidence as low/medium/high from `evidence_count`.
- A single wrong answer cannot drop a topic to "weak" alone; require multiple signals.

## 11. Hosting and Deployment Constraints

- **Local Ollama does not serve remote users.** Public inference needs a separate arrangement, to be re-evaluated against the ₹0 target.
- Before using any host, verify: current free-tier limits, inactivity pausing, DB/storage quotas, request quotas, background worker support, max execution time, privacy terms, credit-card requirement, whether overages can bill.
- Never add a paid fallback without explicit approval.
- Prototype deployment is deferred to Phase 10.

## 12. Testing Strategy

- **Unit:** schemas, scoring, mastery math, retry helper.
- **AI robustness:** feed malformed/partial/hostile model output; expect clean `AI_INVALID_OUTPUT`, no DB writes.
- **Integration:** routes with a mocked model adapter and a test DB/Supabase project.
- **Security:** two-account test proving users cannot read/modify each other's rows (API and RLS).
- **Manual:** benchmark model speed/quality on the real machine.

## 13. Decisions Log

| # | Decision | Status |
|---|---|---|
| 1 | JavaScript (not TypeScript), Zod for validation | Confirmed |
| 2 | Supabase for Postgres + Auth | Confirmed |
| 3 | Tutor: course-first with flagged fallback | Confirmed |
| 4 | Hardware: 8 GB RAM + GPU (model unrecorded) | Confirmed; details pending |
| 5 | No vector DB, microservices, or agent teams initially | Confirmed |
| 6 | Search provider | Open |
| 7 | Online inference / host | Open |
| 8 | Syllabus formats and size limit | Open |
