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

## Current Task

**TASK-021** — Two-account isolation check & Phase 1 Exit Verification (TEST_PLAN §1, §3).

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
| Database/Auth | Supabase — project **not yet created** |
| Model | `qwen3:0.6b` — **Accepted** (130.4 t/s, 100% valid JSON) |
| Search provider | Not chosen (Phase 4) |
| Hosting | Not chosen (Phase 10) |

## Known Issues

- None yet (no code).

## Open Questions

See the open-decisions table in `DECISIONS.md`.

## Next Step

1. Complete TASK-002 (Record GPU model and VRAM in `docs/model-benchmarks.md`).
2. Verify Ollama and benchmark candidate model (TASK-003 through TASK-007).
3. Set up free Supabase project (TASK-008).
4. Proceed to Phase 1 application scaffolding (TASK-012, TASK-013).

## Session Log

| Date | What happened |
|---|---|
| 2026-10-16 | Created all planning documents. Chose JavaScript, Supabase, course-first tutor. |
| 2026-10-16 | Completed TASK-001 (Node v24.13.1, Git 2.56.0 verified). Completed TASK-010 (.gitignore) and TASK-011 (folder skeleton per ARCHITECTURE.md §3). |
