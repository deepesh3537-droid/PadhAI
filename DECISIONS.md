# DECISIONS — Architecture Decision Records

> Permanent technical decisions. **Do not change these silently.** To change one, add a new ADR that supersedes it.
> `DECISIONS.md` = permanent decisions · `MEMORY.md` = current project state.

Status values: **Accepted** · **Proposed** · **Open** · **Superseded**

---

## ADR-001 — Use React (Vite) + Node.js/Express instead of a full-stack framework
**Status:** Accepted
**Decision:** Separate `client/` (React + Vite) and `server/` (Express).
**Reason:** The app needs a long-running backend (AI calls, research worker, rate limiting) that must not live inside request/response serverless handlers. A separate Express server keeps AI orchestration, secrets, and workers in one controllable place. (A Next.js-style unified app was considered, as in the guide's example, and rejected for this reason.)

## ADR-002 — JavaScript (ES modules), not TypeScript
**Status:** Accepted
**Decision:** Use JavaScript on both client and server.
**Reason:** Developer choice; lower setup complexity for an incremental-learning project.
**Consequence:** Compensate with **Zod schemas** for all requests and model output, and JSDoc on exported functions.

## ADR-003 — Supabase for PostgreSQL and Auth
**Status:** Accepted
**Decision:** Use Supabase (PostgreSQL + Auth + Row Level Security).
**Reason:** Managed Postgres and auth without running our own infrastructure; avoids a local DB install on an 8 GB machine; RLS gives database-level isolation.
**Consequence:** Free-tier limits and inactivity pausing must be verified before relying on it. The service-role key is server-only.

## ADR-004 — Ollama with a small open-weight model for local inference
**Status:** Accepted
**Decision:** Use Ollama locally with `qwen3:0.6b` (Apache License 2.0).
**Reason:** Benchmarked on target hardware (NVIDIA GTX 1650, CUDA 12.7): achieved 130.4 tokens/sec, 100% JSON schema validity (20/20 prompts), and under 1 GB VRAM usage.
**Consequence:** Integration remains decoupled via `modelAdapter.js` in case alternative or hosted models are needed later.

## ADR-005 — Replaceable model adapter
**Status:** Accepted
**Decision:** All model calls go through `server/src/ai/modelAdapter.js`; Ollama is one implementation.
**Reason:** The runtime/model will likely change (hosted free inference, larger model).

## ADR-006 — Zero-cost target; no silent paid fallbacks
**Status:** Accepted
**Decision:** ₹0 target for development and the initial prototype. No paid service without explicit approval.
**Reason:** Hard project constraint. ₹0 is a prototype target, not a guarantee for unlimited public use.

## ADR-007 — Plain functions first; LangChain.js / LangGraph.js only when justified
**Status:** Accepted
**Decision:** Start with ordinary functions and an explicit pipeline. Introduce LangChain.js or LangGraph.js only when they solve a concrete problem (e.g., checkpointed, branching research jobs).
**Reason:** Avoid premature complexity; keep the learner able to understand each step.

## ADR-008 — Database is the source of truth for learner progress
**Status:** Accepted
**Decision:** Progress, quiz history, and mastery live in PostgreSQL, never only in model conversation memory.
**Reason:** Model context is temporary and incomplete.

## ADR-009 — Completion and mastery are tracked separately
**Status:** Accepted
**Decision:** `lesson_progress` (completion) and `topic_mastery` (estimated understanding) are separate tables/concepts. A single wrong answer never defines a weakness.

## ADR-010 — Deterministic code for scoring, ownership, validation
**Status:** Accepted
**Decision:** Quiz scoring, authorization checks, CRUD, validation, and rate limiting are plain code, not LLM calls.

## ADR-011 — AI tutor is course-first with flagged fallback
**Status:** Accepted
**Decision:** The tutor prefers course sources and cites them. Answers beyond course material are explicitly labeled.

## ADR-012 — SQL-based retrieval; no vector database initially
**Status:** Accepted
**Decision:** Tutor and profile retrieval use SQL queries. Add vector search only after a demonstrated need.

## ADR-013 — Research runs as persisted, bounded jobs
**Status:** Accepted
**Decision:** Research is never done inside one HTTP request. Jobs are persisted (`queued → researching → validating → generating_course → completed/failed`), bounded by limits in `config/limits.js`, and polled by the client.

## ADR-014 — Retrieved web content is untrusted
**Status:** Accepted
**Decision:** Retrieved pages are treated as data, never instructions; they cannot trigger actions or override system rules.

## ADR-015 — Respect third-party content terms
**Status:** Accepted
**Decision:** Official YouTube IFrame Player API only; fallback links when embedding is blocked; no rehosting or bypassing restrictions.

## ADR-016 — Responsive web app, not native apps
**Status:** Accepted (working assumption)
**Decision:** A responsive web app is sufficient for the prototype.

## ADR-017 — User-Scoped Queries Forwarding JWT for Row Level Security (RLS)
**Status:** Accepted
**Decision:** Express API routes forward the verified user JWT down to repository queries using `getSupabaseClient(token)`.
**Reason:** PostgREST executes queries with the user's JWT under the `authenticated` PostgreSQL role. This satisfies PostgreSQL table permissions and directly evaluates RLS policies (`auth.uid() = user_id`) without requiring privileged `service_role` keys or disabling RLS.

## ADR-018 — SearXNG as Local/Self-Hosted Search Provider
**Status:** Accepted
**Decision:** Use SearXNG (locally hosted or configurable instance via `SEARXNG_URL`) as the search provider for educational resource discovery.
**Reason:** SearXNG is open-source (GPL-3.0), privacy-respecting, has no API key requirements or paid subscription fees (strictly aligns with ₹0 target ADR-006), returns clean JSON output via the `/search?format=json` endpoint, and aggregates multiple search engines (Google, Bing, DuckDuckGo, Wikipedia, arXiv, etc.).
**Consequence:** The application configures `SEARXNG_URL` in `.env` (defaulting to `http://localhost:8080` or a public fallback instance). The provider gracefully handles timeouts or unreachable instances without failing the entire course generation pipeline.

## ADR-019 — Research Orchestration with Plain Functions, Not LangGraph.js
**Status:** Accepted
**Decision:** Retain plain, modular asynchronous JavaScript functions (`pipeline.js`, `worker.js`, `coverage.js`, `stateMachine.js`) backed by durable PostgreSQL state transitions (`research_jobs` table) instead of adopting LangGraph.js or LangChain.js.
**Reason:**
1. *Deterministic, bounded pipeline:* The educational research workflow is an acyclic, bounded sequence of deterministic steps (curriculum lessons → primary video resolution → SearXNG search → SSRF safe-link checks → lexical relevance filtering → coverage analysis with bounded 1 follow-up search → honest gap recording → DB persistence). It has no multi-turn cycles or open-ended multi-agent graph topologies that justify dynamic graph orchestration.
2. *Durability and crash recovery without graph frameworks:* Durability, recovery from server restarts, and atomic progress transitions are directly managed by PostgreSQL via `research_jobs` (`status IN ('queued', 'researching', 'completed', 'failed')`) and `reclaimAbandonedResearchJobs()`. LangGraph's checkpointer abstractions add redundant indirection on top of PostgreSQL without functional benefit.
3. *Strict ₹0 budget and 8 GB RAM target:* LangGraph.js and its dependencies (`@langchain/core`, state runners) introduce considerable bundle weight and runtime memory overhead on local commodity hardware running an Ollama model.
4. *Simplicity and testability:* Plain functions are transparent to inspect, produce standard call stacks, and are straightforwardly verified with native `node:test` suites without framework mocking.
**Consequence:** Consistent with ADR-007 ("Plain functions first"). If future phases introduce complex, non-deterministic multi-agent dialogue loops that demonstrably exceed plain function maintainability, graph orchestration may be re-evaluated.

---

## Open decisions (no ADR yet — do not invent answers)

| Topic | Where to record when resolved |
|---|---|
| Final model + license | ADR-004 update + `docs/model-benchmarks.md` |
| GPU model / VRAM | `docs/model-benchmarks.md` |
| Online inference approach under ₹0 | New ADR |
| Hosting for API + worker | New ADR |
| Syllabus formats + max file size | New ADR |
| Source-quality measurement | New ADR |
| Privacy, retention, account deletion | New ADR + `SECURITY.md` |
| Target number of prototype users | New ADR |
| Course editing in first release | New ADR |

