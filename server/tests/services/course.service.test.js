import test from "node:test";
import assert from "node:assert/strict";
import { generateAndSaveCourse, getCourseDetails } from "../../src/services/course.service.js";
import { courseOutlineSchema } from "../../src/ai/schemas/outline.schema.js";
import { ValidationError, NotFoundError } from "../../src/utils/errors.js";

test("courseOutlineSchema validates compliant curriculum outline", () => {
  const validOutline = {
    title: "Linear Algebra for ML",
    description: "Core linear algebra concepts for machine learning practitioners",
    modules: [
      {
        title: "Module 1: Vectors and Spaces",
        description: "Vector operations, dot products, and vector spaces",
        lessons: [
          {
            title: "Vectors and Dot Products",
            summary: "Introduction to vectors in Rn and geometric intuition",
            objectives: [
              "Perform vector addition and scalar multiplication",
              "Compute dot products and understand orthogonality"
            ]
          }
        ]
      }
    ]
  };

  const parsed = courseOutlineSchema.safeParse(validOutline);
  assert.equal(parsed.success, true);
});

test("courseOutlineSchema rejects outline with missing modules or empty lessons", () => {
  const missingModules = {
    title: "Incomplete Course",
    description: "No modules provided",
    modules: []
  };
  const res1 = courseOutlineSchema.safeParse(missingModules);
  assert.equal(res1.success, false);

  const emptyLessons = {
    title: "Incomplete Module",
    description: "Module has no lessons",
    modules: [
      {
        title: "Module 1",
        description: "Empty",
        lessons: []
      }
    ]
  };
  const res2 = courseOutlineSchema.safeParse(emptyLessons);
  assert.equal(res2.success, false);
});

test("generateAndSaveCourse throws ValidationError when required fields are missing", async () => {
  await assert.rejects(
    async () => {
      await generateAndSaveCourse({ userId: "u-1", topic: "", goal: "Learn math", depth: "beginner" });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Topic is required/);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await generateAndSaveCourse({ userId: "u-1", topic: "Calculus", goal: "", depth: "beginner" });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Goal is required/);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await generateAndSaveCourse({ userId: "u-1", topic: "Calculus", goal: "Pass exam", depth: "expert" });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Depth must be one of/);
      return true;
    }
  );
});

test("getCourseDetails throws NotFoundError when repository returns null", async () => {
  await assert.rejects(
    async () => {
      await getCourseDetails("non-existent-id", "u-1");
    },
    (err) => {
      assert.ok(err instanceof NotFoundError);
      assert.match(err.message, /Course not found or access denied/);
      return true;
    }
  );
});
