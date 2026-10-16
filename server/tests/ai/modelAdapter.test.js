import test from "node:test";
import assert from "node:assert/strict";
import { generateStructured } from "../../src/ai/modelAdapter.js";
import { courseOutlineSchema } from "../../src/ai/schemas/outline.schema.js";
import { buildOutlineRepairPrompt } from "../../src/ai/prompts/outline.prompt.js";
import { AiError } from "../../src/utils/errors.js";

const validSample = {
  title: "Python Fundamentals",
  description: "A comprehensive course on Python basics",
  modules: [
    {
      title: "Module 1: Syntax",
      description: "Basic syntax",
      lessons: [
        {
          title: "Variables and Types",
          summary: "Learn variables",
          objectives: ["Understand integers", "Understand strings"]
        }
      ]
    }
  ]
};

test("modelAdapter: parses and validates valid JSON output on first attempt", async () => {
  const mockGenerate = async () => JSON.stringify(validSample);

  const result = await generateStructured({
    prompt: "Generate course",
    schema: courseOutlineSchema,
    generateFn: mockGenerate
  });

  assert.equal(result.title, "Python Fundamentals");
  assert.equal(result.modules.length, 1);
  assert.equal(result.modules[0].lessons[0].objectives.length, 2);
});

test("modelAdapter: strips markdown code fences (```json ... ```)", async () => {
  const mockGenerate = async () => "```json\n" + JSON.stringify(validSample) + "\n```";

  const result = await generateStructured({
    prompt: "Generate course",
    schema: courseOutlineSchema,
    generateFn: mockGenerate
  });

  assert.equal(result.title, "Python Fundamentals");
});

test("modelAdapter: recovers on repair retry when first attempt returns malformed JSON", async () => {
  let attempts = 0;
  const mockGenerate = async () => {
    attempts++;
    if (attempts === 1) {
      return "{ invalid json syntax ...";
    }
    return JSON.stringify(validSample);
  };

  const result = await generateStructured({
    prompt: "Generate course",
    schema: courseOutlineSchema,
    repairPromptBuilder: buildOutlineRepairPrompt,
    generateFn: mockGenerate
  });

  assert.equal(attempts, 2);
  assert.equal(result.title, "Python Fundamentals");
});

test("modelAdapter: throws AI_INVALID_OUTPUT when model output remains invalid JSON", async () => {
  const mockGenerate = async () => "not a json string";

  await assert.rejects(
    async () => {
      await generateStructured({
        prompt: "Generate course",
        schema: courseOutlineSchema,
        repairPromptBuilder: buildOutlineRepairPrompt,
        generateFn: mockGenerate
      });
    },
    (err) => {
      assert.ok(err instanceof AiError);
      assert.equal(err.code, "AI_INVALID_OUTPUT");
      return true;
    }
  );
});

test("modelAdapter: throws AI_INVALID_OUTPUT when schema validation fails across all retries", async () => {
  const mockGenerate = async () => JSON.stringify({ title: "Incomplete course" }); // Missing description and modules

  await assert.rejects(
    async () => {
      await generateStructured({
        prompt: "Generate course",
        schema: courseOutlineSchema,
        repairPromptBuilder: buildOutlineRepairPrompt,
        generateFn: mockGenerate
      });
    },
    (err) => {
      assert.ok(err instanceof AiError);
      assert.equal(err.code, "AI_INVALID_OUTPUT");
      return true;
    }
  );
});
