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
- [x] **TASK-010**: `.gitignore` setup.
- [x] **TASK-011**: Directory skeleton (`client/`, `server/`, `db/`, `docs/`).

## Current Task

**TASK-002** — Record hardware (RAM, GPU model, VRAM, OS) in `docs/model-benchmarks.md`.

## Environment Facts

| Item | Value |
|---|---|
| OS | Windows 10/11 |
| Node.js / npm | v24.13.1 / 11.8.0 |
| Git | 2.56.0.windows.1 |
| RAM | 8 GB |
| GPU | Present — model and VRAM **not yet recorded** |
| Dev environment | Google Antigravity |
| Language | JavaScript (ES modules) |
| Database/Auth | Supabase — project **not yet created** |
| Model | Candidate: Qwen3-0.6B — **not yet benchmarked** |
| Search provider | Not chosen |
| Hosting | Not chosen |

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
