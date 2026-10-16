# TEST PLAN

> Defines what "working" means. Each phase in `TASKS.md` ends with a check from this list.
> Automated tests mock the model adapter; they must not require a running Ollama.

Legend: **[A]** automated · **[M]** manual

---

## 1. Authentication

- [M] User can sign up
- [M] User can log in and log out
- [M] Invalid credentials show a clear error (no raw backend message)
- [M] Logged-out users are redirected from the dashboard to login
- [A] Protected API route returns **401** with no token
- [A] Protected API route returns **401** with an expired/malformed token
- [A] User ID is taken from the verified token, never from the request body

## 2. Course Generation (Milestone 1)

- [A] Valid model output → course, modules, lessons saved; response matches schema
- [A] Malformed JSON from model → retry → `AI_INVALID_OUTPUT`; **nothing saved**
- [A] JSON that fails schema (missing modules, empty title, wrong types) → rejected; nothing saved
- [A] Output exceeding size limits (too many modules/lessons) → rejected or truncated per spec
- [A] Ollama unreachable → clean error, no crash
- [A] Model timeout → clean error
- [A] DB write failure mid-save → whole save rolled back (atomic)
- [A] Missing/oversized `topic`, `goal`, invalid `depth` → 400 with validation message
- [M] Create a course, refresh, log out/in → course still present
- [M] Loading state is shown during generation; error state has a retry

## 3. Authorization and Data Isolation

- [A/M] User A cannot read User B's course via API (`404` or `403`)
- [A/M] User A cannot modify or delete User B's data
- [M] Verify with direct Supabase queries as User A that RLS blocks User B's rows
- [M] Service-role key is absent from client bundle (search built output)

## 4. Structured Courses and Progress

- [M] Modules/lessons display in correct order
- [M] Prev/next lesson navigation works at boundaries
- [A] Marking a lesson complete is idempotent
- [M] Completion persists across sessions
- [A] Progress percentage is calculated correctly (0, partial, 100%)

## 5. Resources and Embeds

- [A] Duplicate URLs (including trivial variants) are deduplicated
- [A] Search provider failure / quota exhaustion → graceful message, partial results kept
- [A] Dead link detection marks `access_status` appropriately, within timeouts
- [M] Embeddable YouTube video plays via the IFrame API
- [M] Blocked/non-embeddable video shows a fallback link
- [M] Non-embeddable websites open in a new tab with `rel="noopener noreferrer"`
- [A] Every displayed resource has a stored URL and source metadata

## 6. Quizzes

- [A] Quiz schema rejects an answer key that does not match any option
- [A] Scoring is deterministic: same answers → same score
- [A] Quiz fetch endpoint never returns answer keys
- [A] Attempts are saved to the correct user
- [M] Explanations shown for correct and incorrect answers
- [M] Attempt history is visible

## 7. Mastery and Adaptation

- [A] Mastery formula unit tests (recency weighting, evidence count)
- [A] One wrong answer alone does **not** mark a topic as weak
- [A] Mastery and completion are stored independently
- [M] UI shows evidence count and uncertainty wording

## 8. AI Tutor

- [M] Tutor references the current lesson and saved attempts
- [M] Course-based answers show sources
- [M] Beyond-course answers are clearly labeled
- [M] Context persists across sessions (from DB)
- [A] Tutor request over rate limit → 429 with friendly message

## 9. Research Jobs

- [A] Status transitions occur in valid order only
- [A] Failed job stores a **safe** error message
- [A] Interrupted job can be retried/recovered
- [A] Limits are enforced (search rounds, pages, doc size, runtime)
- [A] Hostile page content ("ignore previous instructions…") does not change behavior (prompt-injection test)
- [M] Coverage gaps are shown, not hidden

## 10. Syllabus Upload (Phase 9)

- [A] Wrong file type rejected
- [A] Oversized file rejected
- [A] Unsafe/odd filename handled
- [M] Scanned/unreadable file produces an explicit message, not invented topics
- [M] Ambiguous sections are flagged

## 11. Rate Limiting and Quotas

- [A] Exceeding AI endpoint limit returns 429
- [M] Quota-exhausted message is understandable
- [M] No automatic switch to any paid service

## 12. Responsive and Accessibility

Test every main screen at:

| Width | Device class |
|---|---|
| 375px | Phone |
| 768px | Tablet |
| 1440px | Desktop |

- [M] No horizontal scrolling
- [M] Lesson nav becomes a drawer on small screens
- [M] Keyboard navigation works for forms, nav, quiz
- [M] Visible focus states; contrast meets WCAG AA
- [M] Loading, empty, and error states exist on every async view

## 13. Model Benchmark (Task 0)

- [M] ~20 outline prompts: record JSON validity rate, tokens/sec, RAM/VRAM
- [M] Human review of 5 outlines for quality and hallucinated topics
- [M] Record results in `docs/model-benchmarks.md`

## 14. Pre-Deployment (Phase 10)

- [M] Test from another device and another account
- [M] Re-run all isolation tests on the deployed environment
- [M] Failed job and quota-exhaustion walkthrough
- [M] No secrets in repository history or client bundle
