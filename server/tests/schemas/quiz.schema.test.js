import test from "node:test";
import assert from "node:assert/strict";
import {
  quizSchema,
  quizQuestionSchema,
  quizSubmissionSchema,
  sanitizeQuizForClient
} from "../../src/ai/schemas/quiz.schema.js";

test("quizQuestionSchema: validates well-formed question with valid correct_index", () => {
  const validQuestion = {
    id: "q1",
    prompt: "What is the primary function of an operating system kernel?",
    options: [
      "Manage hardware and system resources",
      "Render 3D graphics in browsers",
      "Compile source code to bytecode",
      "Format hard drives on every boot"
    ],
    correct_index: 0,
    explanation: "The kernel manages CPU, memory, and devices.",
    mistake_notes: "Option 2 is done by GPU/browser engines."
  };

  const parsed = quizQuestionSchema.safeParse(validQuestion);
  assert.equal(parsed.success, true);
});

test("TEST_PLAN §6: Quiz schema rejects an answer key that does not match any option", () => {
  const invalidQuestion = {
    id: "q1",
    prompt: "Which data structure uses LIFO ordering?",
    options: ["Queue", "Stack", "Binary Tree", "Graph"], // indices 0, 1, 2, 3
    correct_index: 4, // Out of bounds!
    explanation: "Stacks are Last-In First-Out.",
    mistake_notes: "Queue is FIFO."
  };

  const parsed = quizQuestionSchema.safeParse(invalidQuestion);
  assert.equal(parsed.success, false);
  const errorIssue = parsed.error.issues.find((i) => i.path.includes("correct_index"));
  assert.ok(errorIssue, "Should report an issue on correct_index");
  assert.match(errorIssue.message, /does not match any option/i);
});

test("quizQuestionSchema: rejects negative correct_index", () => {
  const negativeQuestion = {
    id: "q1",
    prompt: "What does HTTP stand for in networking?",
    options: ["HyperText Transfer Protocol", "High Text Transfer Path"],
    correct_index: -1,
    explanation: "HTTP stands for HyperText Transfer Protocol."
  };

  const parsed = quizQuestionSchema.safeParse(negativeQuestion);
  assert.equal(parsed.success, false);
});

test("quizSchema: validates full quiz with at least 3 questions", () => {
  const fullQuiz = {
    title: "Operating Systems Basics Quiz",
    questions: [
      {
        id: "q1",
        prompt: "What is virtual memory?",
        options: ["RAM abstraction using disk storage", "GPU memory for shaders"],
        correct_index: 0,
        explanation: "Virtual memory provides memory isolation and expansion."
      },
      {
        id: "q2",
        prompt: "What is a deadlock?",
        options: ["Permanent waiting condition", "CPU overheating event"],
        correct_index: 0,
        explanation: "A deadlock occurs when processes wait endlessly for locks."
      },
      {
        id: "q3",
        prompt: "What is a thread in an OS?",
        options: ["Lightweight process / unit of CPU execution", "Physical hardware core"],
        correct_index: 0,
        explanation: "Threads share the process memory space."
      }
    ]
  };

  const parsed = quizSchema.safeParse(fullQuiz);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.questions.length, 3);
});

test("quizSchema: rejects quiz with fewer than 3 questions", () => {
  const shortQuiz = {
    title: "Too Short Quiz",
    questions: [
      {
        id: "q1",
        prompt: "Single lonely question?",
        options: ["Option A", "Option B"],
        correct_index: 0,
        explanation: "Valid explanation"
      }
    ]
  };

  const parsed = quizSchema.safeParse(shortQuiz);
  assert.equal(parsed.success, false);
  assert.match(parsed.error.issues[0].message, /At least 3 questions are required/);
});

test("TEST_PLAN §6: Quiz fetch endpoint / client sanitizer never returns answer keys or explanations", () => {
  const secretQuiz = {
    id: "quiz-123",
    lesson_id: "lesson-abc",
    title: "Lesson Quiz",
    version: 1,
    created_at: new Date().toISOString(),
    questions: [
      {
        id: "q1",
        prompt: "What is 2 + 2?",
        options: ["3", "4", "5"],
        correct_index: 1,
        explanation: "2 + 2 equals 4.",
        mistake_notes: "Common math pitfall"
      }
    ]
  };

  const safe = sanitizeQuizForClient(secretQuiz);

  assert.equal(safe.id, "quiz-123");
  assert.equal(safe.questions.length, 1);
  assert.equal(safe.questions[0].id, "q1");
  assert.equal(safe.questions[0].prompt, "What is 2 + 2?");
  assert.deepEqual(safe.questions[0].options, ["3", "4", "5"]);

  // STRICT VERIFICATION: answer keys and explanations MUST be undefined
  assert.equal(safe.questions[0].correct_index, undefined);
  assert.equal(safe.questions[0].correctIndex, undefined);
  assert.equal(safe.questions[0].explanation, undefined);
  assert.equal(safe.questions[0].mistake_notes, undefined);
});

test("quizSubmissionSchema: validates submitted answers payload", () => {
  const validSubmission = {
    answers: {
      q1: 0,
      q2: 2
    }
  };

  const parsed = quizSubmissionSchema.safeParse(validSubmission);
  assert.equal(parsed.success, true);

  const emptySubmission = { answers: {} };
  assert.equal(quizSubmissionSchema.safeParse(emptySubmission).success, false);
});
