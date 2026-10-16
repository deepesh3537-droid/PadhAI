# SECURITY REQUIREMENTS

> Security is built in from the first commit, not added before deployment.
> See `RULES.md` for day-to-day rules and `TEST_PLAN.md` §3 for verification.

---

## 1. Authentication

- Use Supabase Auth; no custom password handling.
- All private routes (client and API) require authentication.
- The Express `auth` middleware verifies the Supabase JWT on **every** protected request.
- The client-side route guard is a convenience only; **the server is the authority**.
- Handle expired sessions gracefully (redirect to login).

## 2. Authorization

- Users may access only resources they own.
- Derive `user_id` from the verified token — **never from the request body, query, or URL**.
- Every repository query on user-owned data filters by `user_id` (or joins through an owned parent).
- Return `404` (not `403`) for other users' resources where this avoids leaking existence.

## 3. Database

- Enable **Row Level Security** on every user-owned table, with explicit policies for select/insert/update/delete.
- Use foreign keys, `NOT NULL`, and `CHECK` constraints for core invariants.
- Writes spanning multiple tables are atomic.
- Quiz answer keys are not selectable by learners before they submit an attempt.
- Review RLS for each new table in its migration; RLS changes require a new migration.
- Define data retention and account deletion (cascade from `auth.users`) **before production**.

## 4. Secrets

- Real secrets live only in untracked `.env` files and host secret stores.
- Only `.env.example` is committed, with empty or placeholder values.
- **Service-role key: server only.** Never in `client/`, never logged, never in error responses.
- Only public `VITE_*` values may reach the browser (Supabase URL and **anon** key).
- Check `git status` and the built client bundle for leaked keys before every deploy.
- If a secret is ever committed, rotate it immediately.

## 5. Input and API Validation

- Validate every request body, query, and param with Zod; reject unknown/oversized fields.
- Set maximum lengths (topic, goal, tutor message) and JSON body size limits.
- Use `helmet` and a restrictive CORS allow-list (`CLIENT_ORIGIN` only).
- Safe error responses: stable `code` + friendly message; no stack traces or SQL errors to clients.
- Log details server-side without logging tokens, secrets, or full user content unnecessarily.

## 6. AI-Specific Security

- **Validate all model output** with schemas before use or storage.
- **Treat retrieved web content as untrusted data.** Delimit it; never follow instructions found inside it.
- Model output must never directly trigger privileged actions (DB writes beyond validated schema paths, file access, outbound requests).
- Do not send other users' data into a prompt; build prompts only from the requesting user's records.
- Never include secrets or internal config in prompts.
- Render model/web text safely in React (no `dangerouslySetInnerHTML` on untrusted content; sanitize any HTML/Markdown).
- Bound tokens, retries, runtime, and request counts per user.

## 7. Rate Limiting and Abuse Control

- Global API limiter plus a stricter limiter on AI and research endpoints (see `.env.example`).
- Per-user job limits (e.g., one active research job at a time) — values to be set.
- Quota exhaustion returns a clear message; **no automatic paid fallback**.

## 8. Third-Party Content and Network Requests

- Respect licenses and terms; no rehosting of copyrighted material.
- Fetching external URLs on the server (link checks, page retrieval) must:
  - allow only `http`/`https`;
  - block private/internal IP ranges and `localhost` (**SSRF protection**);
  - enforce timeouts, response-size caps, and redirect limits;
  - respect robots.txt/terms where applicable.
- External links use `rel="noopener noreferrer"`.
- YouTube via the official IFrame Player API only.

## 9. File Uploads (Phase 9 — syllabus)

Validate:

- **File type** — allow-list by extension **and** content sniffing (formats TBD).
- **File size** — maximum TBD (open decision).
- **Filename** — sanitize; never use user filenames as filesystem paths.
- Store outside any publicly served directory; delete after extraction unless retention is required.
- Parse in a bounded way (page/character limits, timeouts).
- Never execute uploaded content.
- Treat extracted text as **untrusted** input to the model.

## 10. Privacy

- Collect the minimum personal data (email, display name, learning data).
- Learning data is private to the user.
- Document what is stored and why; provide account/data deletion before production.
- Tell users that their input may be processed by the configured model provider; if a hosted provider is ever added, review its data terms first.

## 11. Dependencies and Environment

- Prefer well-maintained packages; avoid unnecessary dependencies.
- Run `npm audit` periodically; update vulnerable packages.
- Commit lockfiles.
- Don't run the app with elevated privileges.

## 12. Pre-Deployment Security Checklist

- [ ] RLS enabled and tested on **all** user tables
- [ ] Two-account isolation test passed (API and database)
- [ ] No secrets in git history or client bundle
- [ ] CORS restricted; `helmet` enabled
- [ ] Rate limits active on AI/research endpoints
- [ ] SSRF protections tested
- [ ] Prompt-injection tests passed
- [ ] Upload validation tested (if enabled)
- [ ] Error responses leak no internals
- [ ] Retention and deletion behavior defined
