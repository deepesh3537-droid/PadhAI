# PRD — AI-Powered Personalized Learning Platform

> Status: Planning complete. Implementation not yet started.
> Source of truth for scope. See `ARCHITECTURE.md` (how), `DESIGN.md` (UI), `RULES.md` (conventions), `TASKS.md` (work plan).

---

## 1. Summary

A web app that turns a topic or a university syllabus into a **structured, personalized course** built from **free online resources**, then helps the learner study it through quizzes, feedback, persistent progress tracking, adaptive paths, and an AI tutor.

It must be **more than a chatbot or a list of links**.

## 2. Problem

Students have abundant free material but:

- Don't know which resources are worth studying.
- Can't organize scattered videos, PDFs, and articles into a logical path.
- Don't know prerequisites or what to learn first.
- Find generic courses don't match their syllabus, goal, or depth.
- Watch/read without retention or real understanding.
- Don't know their own weaknesses or misconceptions.
- Use tools that don't keep a detailed, persistent record of their progress.

## 3. Target Users

| Persona | Need | Example |
|---|---|---|
| **College student** | Upload a syllabus, get an organized course covering its topics, prerequisites, and objectives | Uploads an ML-mathematics syllabus |
| **Self-learner** | Enter any topic + goal + depth, get a path | "Learn the math needed for machine learning" |

## 4. Goals and Non-Goals

### Goals
1. Automatically generate a structured course from a topic or syllabus.
2. Ground courses in discovered, verified free resources (not model memory alone).
3. Provide a single learning workspace (lessons, embedded video, PDFs, quizzes, tutor).
4. Track **completion** and **demonstrated understanding** separately, in the database.
5. Adapt revision and next steps using evidence.
6. Stay within a **₹0 budget** for development, inference, and the initial prototype.

### Non-Goals / Out of Scope (for the prototype)
- Unlimited public service with free inference.
- Rehosting, downloading, or redistributing third-party content.
- Autonomous multi-agent systems, microservices, or vector databases without demonstrated need.
- Native mobile apps (responsive web is enough).
- Payments, subscriptions, or any paid-service fallback.
- Bypassing embed or access restrictions of any site.

## 5. Confirmed Decisions

| Decision | Choice |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express.js |
| Language | **JavaScript** (ES modules) on both sides |
| Database + Auth | **PostgreSQL via Supabase** (Auth + Row Level Security) |
| Local model runtime | Ollama |
| Starting model | Qwen3-0.6B — *benchmark candidate only, not final* |
| AI tutor scope | **Course-first with flagged fallback**: prefers course sources and cites them; any answer beyond course material is clearly labeled |
| Hardware | 8 GB RAM, GPU present (model/VRAM to be recorded during Task 0) |
| Dev environment | Google Antigravity |
| Orchestration | Plain functions first; LangChain.js / LangGraph.js only when justified |

## 6. Feature Requirements

Priority: **P0** = first milestone, **P1** = MVP complete, **P2** = after MVP.

### F1. Syllabus and topic input
- P0: Topic text, goal, desired depth (beginner / intermediate / advanced).
- P1: Optional current-knowledge self-assessment, time constraints, learning-style preference.
- P2: Syllabus upload (formats and size limit TBD). Must flag unreadable/ambiguous content and **never invent missing syllabus topics**.

**Acceptance:** Input is converted into structured topics and measurable learning objectives.

### F2. Automated resource research
- P1: One permitted search source; store URL + metadata; dedupe; basic relevance and accessibility checks; source traceability per lesson.
- P2: Bounded multi-round research, coverage/gap analysis, source-quality scoring.

**Rules:** No assumption that every site has a free API; no unlimited scraping; AI interpretations are distinguished from source-supported facts; retrieved content is untrusted (prompt-injection safe).

### F3. Automatic curriculum generation
- Course title/description → modules → lessons → objectives, prerequisites, resources, summaries, quizzes, references, progress info.
- **P0:** Schema-validated outline (title, modules, lessons, objectives).
- P1: Resources attached to lessons.

**Acceptance:** Output validates against schema; unsupported topics are not claimed as verified.

### F4. Unified learning interface
- P0: Display a saved outline.
- P1: Dashboard, module/lesson navigation, completion tracking, progress indicators, resource list.
- P1: YouTube embeds via the official IFrame Player API, with a fallback link when embedding fails.
- P2: PDF viewer (only where permitted), contextual tutor panel.

**Restrictions:** Respect platform policies, attribution, ads, and playback restrictions. Don't bypass embed bans. Don't rehost copyrighted material.

### F5. Quizzes and active learning
- Question types: MCQ, short answer, conceptual, application, scenario; coding exercises where relevant (later).
- Answer evaluation, explanations of correct answers and mistakes, attempt history, topic-level performance.
- **Scoring is deterministic code, not an LLM.**
- A single wrong answer is **not** proof of lacking a skill.

### F6. Persistent learner profile
- Stored in the database: goals, depth, enrollments, completion, quiz history, recurring mistakes, mastery estimates, revision needs, recommended next lessons.
- **Completion ≠ mastery.** Tracked separately.
- Never rely on model conversation memory as the record.

### F7. Adaptive learning path
- Adjust difficulty, revision, practice questions, explanation depth, next topic, prerequisite revision, further resources.
- Adaptation must be **evidence-based and explainable**; mastery is an estimate with a confidence/evidence count.

### F8. Personalized AI tutor
- Explain concepts, answer lesson questions, explain quiz mistakes, give examples/analogies, identify prerequisites, recommend revision, generate practice.
- Retrieves course + learner-profile data from the DB.
- **Scope:** course-first; outside-course answers are labeled as such.

## 7. User Workflow

1. Create account / sign in.
2. Enter topic (or upload syllabus later) + goal + depth.
3. System builds topic map → prerequisites → objectives.
4. System researches and verifies resources (P1+).
5. System generates the course automatically (no per-stage approval).
6. Learner studies lessons, watches embedded videos, takes quizzes.
7. System evaluates, explains mistakes, saves evidence.
8. Course, revision schedule, and tutor adapt over time.
9. Learner can review and revisit the course; editing is a later feature.

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Cost** | ₹0 target; no mandatory paid APIs; no silent paid fallback; explicit approval for any paid service |
| **Hardware** | Runs on 8 GB RAM dev machine; small quantized model; lightweight tooling |
| **Security** | Server-side secrets; RLS on all user tables; validated writes; rate limiting |
| **Privacy** | Minimal personal data; retention and account deletion defined before production |
| **Reliability** | Bounded retries; persisted job state; graceful quota exhaustion; understandable errors |
| **Legal** | Respect licenses, ToS, copyright, model licenses |
| **Transparency** | Show app limits to users; mastery shown as estimates |

## 9. Success Criteria

### Milestone 1 (first vertical slice)
A signed-in learner enters a topic and depth, receives a **schema-valid** course outline from a **local open-weight model**, it is **persisted in PostgreSQL**, and they can reload and view it later in React. Malformed model output, model failure, and DB errors are handled and tested.

### MVP — a user must be able to:
1. Create an account and log in.
2. Enter a topic, goal, and depth.
3. Receive an automatically generated, structured course.
4. Open the course and navigate modules and lessons.
5. View resources for a lesson (embedded video where permitted, fallback link otherwise).
6. Mark a lesson complete and see progress.
7. Take a lesson quiz and see explanations for mistakes.
8. See estimated mastery with its evidence.
9. Ask the tutor a question and get a course-grounded answer.
10. Log out, log back in, and find everything saved.

Plus:
- Courses with modules/lessons and attached verified resources.
- Working lesson completion, embedded video with fallback, lesson quizzes with saved attempts.
- Topic mastery estimates with visible evidence.
- Tutor that retrieves course + profile context.
- Data isolation verified across two accounts.

## 10. Risks

1. Free ≠ unlimited (hosting, search, inference).
2. Small models may format outlines but fail at research/reasoning.
3. Legal/technical limits on resource access.
4. Embeds may fail.
5. AI output can be wrong — validate and trace sources.
6. Research can become slow/expensive — bound everything.
7. Persistent profiles need real DB design.
8. Privacy and data isolation.
9. Mastery estimates are uncertain.
10. Free hosts may not support background jobs.
11. Overengineering.
12. Accidental charges.

## 11. Open Decisions (do not invent answers)

- [ ] Exact model and license passing local benchmarks (Task 0).
- [ ] Exact GPU model / VRAM (record in Task 0).
- [ ] Search provider with suitable current free terms.
- [ ] How online inference works while staying at ₹0.
- [ ] Host that supports Express API + research worker.
- [ ] Syllabus formats and maximum upload size.
- [ ] How source quality/verification is measured.
- [ ] Privacy, retention, and account-deletion rules.
- [ ] Number of users the prototype must support.
- [ ] Whether course editing is in the first release.
- [ ] Whether vector search is ever needed (default: no).

**Working assumptions (reversible):** responsive web app is sufficient; no vector DB; one search provider initially; email/password auth through Supabase.
