# AI-Powered Personalized Learning Platform

A web app for college students and self-learners. Enter a topic and goal (syllabus upload comes later) and the system builds a structured course from free online resources, then helps you learn with quizzes, feedback, saved progress, adaptive paths, and an AI tutor.

> **Status:** Planning complete. Implementation starts with Milestone 1 (see `TASKS.md`).
> **Budget target:** ₹0 for development and the initial prototype. This is a prototype target, not a promise of unlimited free service.

## Documentation

| File | Purpose |
|---|---|
| [PRD.md](PRD.md) | What we are building and why |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, folder structure, data model, API, AI layer |
| [DESIGN.md](DESIGN.md) | UI/UX guidelines and screens |
| [RULES.md](RULES.md) | Conventions for developers and AI assistants |
| [TASKS.md](TASKS.md) | Phased, testable implementation plan |
| [DECISIONS.md](DECISIONS.md) | Permanent technical decisions (ADRs) |
| [MEMORY.md](MEMORY.md) | Current project state — update every session |
| [TEST_PLAN.md](TEST_PLAN.md) | What "working" means, per feature |
| [SECURITY.md](SECURITY.md) | Security requirements |
| [.env.example](.env.example) | Environment variable template |

## Tech Stack

- **Frontend:** React + Vite (JavaScript)
- **Backend:** Node.js + Express.js (JavaScript, ES modules)
- **Database/Auth:** PostgreSQL via Supabase (Row Level Security)
- **AI runtime:** Ollama with a small open-weight model (candidate: Qwen3-0.6B — to be benchmarked and license-checked)
- **Validation:** Zod
- **Dev environment:** Google Antigravity

LangChain.js and LangGraph.js are optional and added only when a real need appears.

## Prerequisites

- Node.js (current LTS) and npm
- Git
- [Ollama](https://ollama.com) installed locally
- A free [Supabase](https://supabase.com) project
- Machine: 8 GB RAM, GPU present (record details in `docs/model-benchmarks.md`)

## Quick Start (after the scaffold exists)

```bash
# 1. Environment
cp .env.example server/.env          # then fill in real values
cp client/.env.example client/.env   # public VITE_ values only

# 2. Model
ollama pull <model-tag>              # verify the exact tag first
ollama serve                         # if not already running

# 3. Backend
cd server
npm install
npm run dev                          # http://localhost:4000

# 4. Frontend (new terminal)
cd client
npm install
npm run dev                          # http://localhost:5173
```

Apply the SQL files in `db/migrations/` in order using the Supabase SQL editor (or the Supabase CLI).

## First Milestone

**Topic input → local open-weight model → schema-validated course outline → PostgreSQL persistence → display in React.**

Follow Phase 2 in [TASKS.md](TASKS.md). Resource research is added only after this works.

## Project Structure

See the full tree in [ARCHITECTURE.md §3](ARCHITECTURE.md). In short:

```
client/   React + Vite app
server/   Express API, AI layer, research worker
db/       SQL migrations
docs/     Benchmarks and decisions
```

## Security Notes

- Never commit `.env` files.
- The Supabase **service-role key** is server-only.
- Only `VITE_`-prefixed public values belong in the client.
- Every user table must have Row Level Security.

## Known Limitations

- A model running on your PC is **not** available to other users once deployed; public inference must be solved separately within free limits.
- Free tiers can change, pause, or run out. The app must degrade gracefully and never auto-switch to a paid service.
- Small local models can structure outlines but may be unreliable for deep research.
- Videos may not be embeddable; a fallback link is shown. Third-party content is never rehosted.
- Mastery scores are estimates based on limited evidence.

## Contributing / AI Assistants

Read [RULES.md](RULES.md) first. Build one small, tested step at a time.
