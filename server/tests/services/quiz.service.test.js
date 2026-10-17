import test from "node:test";
import assert from "node:assert/strict";
import { scoreQuizAttempt } from "../../src/services/quiz.service.js";

const sampleQuestions = [
  {
    id: "q1",
    prompt: "Which protocol is connection-oriented?",
    options: ["UDP", "TCP", "IP", "DNS"],
    correct_index: 1, // TCP
    explanation: "TCP uses a three-way handshake.",
    mistake_notes: "UDP is connectionless."
  },
  {
    id: "q2",
    prompt: "What is the time complexity of binary search on a sorted array?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correct_index: 1, // O(log n)
    explanation: "Binary search divides the search space in half each step.",
    mistake_notes: "O(n) is linear scan."
  },
  {
    id: "q3",
    prompt: "What layer of the OSI model does IP operate at?",
    options: ["Application", "Transport", "Network", "Data Link"],
    correct_index: 2, // Network
    explanation: "IP handles routing at Layer 3 (Network).",
    mistake_notes: "Transport is Layer 4 (TCP/UDP)."
  }
];

test("TEST_PLAN §6: Scoring is deterministic: same answers -> same score", () => {
  const answers = {
    q1: 1,
    q2: 1,
    q3: 0 // Incorrect
  };

  const result1 = scoreQuizAttempt({ questions: sampleQuestions, submittedAnswers: answers });
  const result2 = scoreQuizAttempt({ questions: sampleQuestions, submittedAnswers: answers });

  assert.equal(result1.score, 67);
  assert.equal(result1.correctCount, 2);
  assert.equal(result1.totalQuestions, 3);
  assert.deepEqual(result1, result2, "Scoring must be strictly deterministic across repeated calls");
});

test("scoreQuizAttempt: 100% perfect score calculation", () => {
  const answers = {
    q1: 1,
    q2: 1,
    q3: 2
  };

  const result = scoreQuizAttempt({ questions: sampleQuestions, submittedAnswers: answers });
  assert.equal(result.score, 100);
  assert.equal(result.correctCount, 3);
  assert.equal(result.totalQuestions, 3);

  // Verify itemized results
  for (const item of result.questionResults) {
    assert.equal(item.isCorrect, true);
    assert.ok(item.explanation.length > 0);
  }
});

test("scoreQuizAttempt: 0% score calculation", () => {
  const answers = {
    q1: 0,
    q2: 0,
    q3: 0
  };

  const result = scoreQuizAttempt({ questions: sampleQuestions, submittedAnswers: answers });
  assert.equal(result.score, 0);
  assert.equal(result.correctCount, 0);
  assert.equal(result.totalQuestions, 3);
  assert.equal(result.questionResults.every((r) => !r.isCorrect), true);
});

test("scoreQuizAttempt: handles missing/unanswered questions gracefully", () => {
  const answers = {
    q1: 1 // Only answered 1 question
  };

  const result = scoreQuizAttempt({ questions: sampleQuestions, submittedAnswers: answers });
  assert.equal(result.score, 33);
  assert.equal(result.correctCount, 1);
  assert.equal(result.totalQuestions, 3);

  assert.equal(result.questionResults[0].isCorrect, true);
  assert.equal(result.questionResults[1].isCorrect, false);
  assert.equal(result.questionResults[1].chosenIndex, null);
  assert.equal(result.questionResults[2].isCorrect, false);
  assert.equal(result.questionResults[2].chosenIndex, null);
});
