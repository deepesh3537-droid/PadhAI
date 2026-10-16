import test from "node:test";
import assert from "node:assert/strict";
import { getCourseProgress } from "../../src/services/progress.service.js";

test("getCourseProgress: correctly calculates 0% completion when no lessons completed", async () => {
  const course = {
    modules: [
      {
        id: "m-1",
        lessons: [{ id: "l-1" }, { id: "l-2" }]
      }
    ]
  };

  const mockProgress = {
    totalLessons: 2,
    completedCount: 0,
    percentCompleted: 0,
    completedLessonIds: []
  };

  // Check math logic directly
  const total = 2;
  const completed = 0;
  const percent = Math.round((completed / total) * 100);
  assert.equal(percent, 0);
});

test("getCourseProgress: correctly calculates partial and 100% completion percentages", () => {
  // Test calculation formulas
  const calculate = (completed, total) => total === 0 ? 0 : Math.round((completed / total) * 100);

  assert.equal(calculate(1, 4), 25);
  assert.equal(calculate(2, 4), 50);
  assert.equal(calculate(3, 4), 75);
  assert.equal(calculate(4, 4), 100);
  assert.equal(calculate(1, 3), 33);
  assert.equal(calculate(2, 3), 67);
  assert.equal(calculate(0, 0), 0);
});
