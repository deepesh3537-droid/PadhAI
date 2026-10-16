# DESIGN — UI/UX Guidelines

> Responsive web app is sufficient for the prototype. Design for clarity and focus first; polish later.
> Styling: Tailwind CSS is an **[Assumption]**, optional. Keep design tokens in one place regardless.

---

## 1. Design Principles

1. **Learning first.** The lesson content is the star; chrome stays quiet.
2. **Always show where I am.** Course → module → lesson, plus progress.
3. **Honest AI.** Label AI-generated content, show sources, express mastery as an estimate.
4. **Graceful failure.** Every async action has loading, empty, error, and quota-exhausted states.
5. **Respect third-party content.** Embed only where allowed; always offer a fallback link with attribution.
6. **Simple before fancy.** No unnecessary animation, no heavy UI libraries.

## 2. Information Architecture

```
/login
/                      Dashboard (my courses, continue learning, revision due)
/courses/new           Create course (topic, goal, depth, optional extras)
/courses/:id           Course overview (outline, progress, research status)
/courses/:id/lessons/:lessonId   Lesson workspace
/profile               Learner profile, mastery estimates (later)
```

## 3. Key Screens

### 3.1 Login / Sign-up
- Email + password (Supabase Auth). Clear error messages. Link between sign-in and sign-up.

### 3.2 Dashboard
- "Continue learning" card (last lesson).
- Course cards: title, goal, depth badge, progress bar, status chip (`draft / researching / ready / failed`).
- Empty state: short explanation + **Create your first course** button.
- *(Later)* "Revise these topics" list from mastery data.

### 3.3 Create Course (Milestone 1 screen)
Fields:
| Field | Control | Notes |
|---|---|---|
| Topic | Text input | Required, length-limited |
| Goal | Textarea | What do you want to achieve? |
| Depth | Select / segmented | Beginner · Intermediate · Advanced |
| *(P1)* Current knowledge | Optional select | |
| *(P1)* Time available | Optional input | |
| *(P2)* Syllabus upload | File input | Flag unreadable content |

Behavior:
- Submit disabled while generating; show spinner with text like "Generating your outline… this can take a minute on a local model."
- On success → navigate to course page.
- On failure → inline error with retry (e.g., "The AI returned an unusable outline. Try again.").

### 3.4 Course Overview
- Header: title, description, goal, depth, overall progress.
- Collapsible modules, each listing lessons with completion check and objectives preview.
- Research status banner when a job is running: step name + progress; poll-based.
- Clear marker for **unverified / no resources yet** lessons so users aren't misled.

### 3.5 Lesson Workspace
Desktop layout (3 regions):

```
┌────────────┬──────────────────────────────┬──────────────┐
│ Course nav │ Lesson header + objectives   │ Tutor panel  │
│ (modules / │ Embedded video / resource    │ (collapsible)│
│  lessons)  │ Summary + sources            │              │
│            │ Resource list                │              │
│            │ [Mark complete] [Take quiz]  │              │
└────────────┴──────────────────────────────┴──────────────┘
```

- Mobile: nav becomes a drawer; tutor becomes a bottom sheet / separate tab.
- Video: YouTube IFrame Player API. If it fails to load or embedding is disabled, show a card: thumbnail/title + **"Watch on YouTube"** link.
- Non-embeddable sites: show title, publisher, short note, and **Open resource** (new tab, `rel="noopener noreferrer"`).
- Every resource shows type icon, source/publisher, and verification badge.
- "Mark complete" is separate from quiz mastery.

### 3.6 Quiz
- One question at a time or a short list; progress indicator.
- Types: MCQ, short answer, conceptual, scenario (coding later).
- After submission: score, per-question correctness, explanation of the right answer and of the learner's mistake, and a "Practice this topic" action.
- Answer keys never sent before submission.
- Attempt history list on the lesson.

### 3.7 AI Tutor Panel
- Chat view tied to the current lesson context.
- Each answer shows source chips (lesson/resource) when course-based.
- Answers beyond course material show a distinct banner: **"Beyond your course materials"**.
- Quick actions: "Explain simpler", "Give an example", "Quiz me".
- Handles quota exhaustion with a clear, non-technical message.

### 3.8 Profile / Mastery (later)
- Topic list with mastery estimate, **evidence count**, and last-assessed date.
- Wording: "Estimated mastery: Medium (based on 4 answers)". Never "You are weak at X" from one answer.

## 4. Components (reusable)

`Button`, `Card`, `Badge`, `ProgressBar`, `Spinner`, `ErrorBanner`, `EmptyState`, `Modal`, `Tabs`, `Collapsible`, `FormField`, `ResourceCard`, `VideoEmbed`, `QuestionCard`, `FeedbackPanel`, `MessageBubble`.

Each async view uses a shared pattern: `loading → error → empty → content`.

## 5. Visual Tokens (proposed)

**Style:** Modern · Minimal · Professional · Calm (reading-focused).

**Typography:** Inter (free, open-source; self-host via `@fontsource/inter` to avoid external requests), falling back to the system UI stack. Base 16px, line-height 1.6 for lesson content.

| Token | Value | Notes |
|---|---|---|
| `--color-primary` | `#6366F1` | Accents, links, progress |
| `--color-primary-strong` | `#4F46E5` | Button backgrounds with white text (better contrast) |
| `--color-bg` | `#F8FAFC` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-text` | `#0F172A` | Body text |
| `--color-muted` | `#64748B` | Secondary text |
| `--color-border` | `#E2E8F0` | Dividers, outlines |
| `--color-success` | `#16A34A` | Completed, correct |
| `--color-warning` | `#D97706` | Partial / unverified |
| `--color-danger` | `#DC2626` | Errors, destructive |
| `--color-info` | `#0284C7` | Notices, "beyond course" label |
| Spacing scale | 4 / 8 / 12 / 16 / 24 / 32 | |
| Card radius | **12px** | Same on every page |
| Input/button radius | 8px | |
| Dark mode | Optional, later | Colors are CSS variables so it is easy to add |

*(Colors are an **[Assumption]** — adjust once, in `client/src/styles/index.css`, and every page follows.)*

### Buttons

| Variant | Use | Style |
|---|---|---|
| **Primary** | Main action per view (Create course, Submit quiz) | `primary-strong` background, white text |
| **Secondary** | Supporting actions (Cancel, Back) | White background, border, dark text |
| **Destructive** | Delete, remove | `danger` background, white text, requires confirmation |
| **Ghost/Link** | Low-emphasis actions | No background |

Rules: one primary button per view; disabled state while loading; visible focus ring; minimum 40px touch height (44px on mobile).

### Cards
12px radius, white surface, 1px `--color-border`, subtle shadow only on hover/focus. Never mix square and rounded cards.

### UX Requirements
- Mobile responsive (375 / 768 / 1440px)
- Loading, empty, and error states on every async view
- Accessible forms (labels, error text linked via `aria-describedby`)

Define colors as CSS variables (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, …) in `client/src/styles/index.css`.

## 6. Accessibility

- Semantic HTML, labeled inputs, visible focus states.
- Keyboard-navigable lesson nav, quiz, and tutor.
- Color contrast ≥ WCAG AA; never rely on color alone for status.
- Video fallback and transcripts/links where available.
- `aria-live` for loading, job status, and quiz feedback.

## 7. State Patterns

| State | UI |
|---|---|
| Loading | Skeleton or spinner with context text |
| Empty | Short explanation + primary action |
| Error | Plain-language message, retry button, no stack traces |
| Quota exhausted | "AI usage limit reached for now. Try again later." |
| Job running | Step label + progress; user can leave and return |
| Partial research | Banner listing lessons without verified resources |
| Embed blocked | Fallback link card |

## 8. Copy Guidelines

- Plain, encouraging, honest. No claims of certainty about AI output.
- Label AI-generated summaries ("AI-generated summary based on the sources below").
- Show limitations in an unobtrusive "About limits" note (free-tier prototype).

## 9. Out of Scope for Initial Design

Gamification, social features, notifications, native apps, custom theming, and advanced animations.
