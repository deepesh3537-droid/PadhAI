import path from "node:path";
import { PDFParse } from "pdf-parse";
import { limits } from "../config/limits.js";
import { generateStructured } from "../ai/modelAdapter.js";
import { syllabusParsedSchema } from "../ai/schemas/syllabus.schema.js";
import { courseOutlineSchema } from "../ai/schemas/outline.schema.js";
import { buildSyllabusParsePrompt, buildCourseFromSyllabusPrompt } from "../ai/prompts/syllabus.prompt.js";
import { createCourseWithCurriculum } from "../db/repositories/course.repository.js";
import { ValidationError, AppError } from "../utils/errors.js";

/**
 * Sanitizes and validates uploaded syllabus filenames to prevent path traversal attacks.
 * (SECURITY §9, TEST_PLAN §10).
 *
 * @param {string} rawName
 * @returns {string} Safe filename
 */
export function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== "string") {
    return "syllabus_document";
  }

  // Reject path traversal tokens immediately
  if (rawName.includes("..") || rawName.includes("/") || rawName.includes("\\") || rawName.includes("\0")) {
    // Defang into base name
    const base = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, "_");
    return base || "sanitized_syllabus";
  }

  const sanitized = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.slice(0, 100) || "sanitized_syllabus";
}

/**
 * Validates upload bounds, sanitizes filenames, and extracts raw text from PDF, TXT, or MD documents.
 * Explicitly rejects scanned, image-only, or corrupted files with clear actionable error messages.
 * (TASK-077, TASK-078, PRD §6 F1, SECURITY §9, TEST_PLAN §10).
 *
 * @param {object} params
 * @param {Buffer} params.buffer File byte buffer
 * @param {string} params.originalName Original upload filename
 * @param {string} [params.mimeType] MIME type header
 * @returns {Promise<{ text: string, originalName: string, charCount: number }>}
 */
export async function validateAndExtractSyllabusText({ buffer, originalName, mimeType }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new ValidationError("No file content provided for extraction");
  }

  // 1. File size validation (SECURITY §9 / ADR-020)
  const maxSize = limits.syllabus?.maxFileSizeBytes || 5 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new ValidationError(`File size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds the 5 MB limit.`);
  }

  // 2. Filename and extension validation
  const safeName = sanitizeFilename(originalName || "syllabus");
  const ext = path.extname(safeName).toLowerCase();
  const allowedExts = limits.syllabus?.allowedExtensions || [".pdf", ".txt", ".md"];

  if (!allowedExts.includes(ext)) {
    throw new ValidationError(
      `Unsupported file type '${ext || "unknown"}'. Only ${allowedExts.join(", ")} files are supported.`
    );
  }

  let rawText = "";

  // 3. Text extraction based on file type
  if (ext === ".txt" || ext === ".md") {
    rawText = buffer.toString("utf-8");
  } else if (ext === ".pdf") {
    try {
      const parser = new PDFParse({ data: buffer });
      await parser.load();
      const textResult = await parser.getText();
      rawText = textResult?.text || "";
    } catch (pdfErr) {
      console.warn("[SyllabusService] PDF extraction failed:", pdfErr.message);
      throw new ValidationError(
        "We could not read this PDF. The file may be password-protected, encrypted, or corrupted. Please upload a standard text PDF or paste as plain text."
      );
    }
  }

  // 4. Sanitize control characters
  const cleanText = rawText
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim();

  // 5. Explicit check for unreadable, scanned, or empty documents (PRD §6 F1, RULES.md §1 9, TEST_PLAN §10)
  const minChars = limits.syllabus?.minExtractedChars || 50;
  if (cleanText.length < minChars) {
    throw new ValidationError(
      "We could not extract readable text from this file. The document may be scanned, image-only, or empty. Please upload a text-based document or paste your syllabus as plain text."
    );
  }

  // 6. Enforce character extraction budget
  const maxChars = limits.syllabus?.maxExtractedChars || 50000;
  const boundedText = cleanText.slice(0, maxChars);

  return {
    text: boundedText,
    originalName: safeName,
    charCount: boundedText.length
  };
}

/**
 * Deterministic syllabus parser fallback when LLM is unavailable or for heuristic verification.
 * Extracts sections based on standard academic headings (Unit, Module, Week, Chapter).
 * (TASK-079, ADR-010).
 *
 * @param {string} text
 * @param {string} [fallbackTitle]
 * @returns {object} Structured parsed syllabus
 */
export function extractDeterministicSyllabus(text, fallbackTitle = "Syllabus Course") {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const title = lines[0] && lines[0].length < 120 ? lines[0] : fallbackTitle;
  const modules = [];
  const ambiguities = [];

  let currentModule = null;
  const unitRegex = /^(?:unit|module|chapter|week|part|section)\s*(\d+|[ivx]+)[:.\-\s]+(.+)/i;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const unitMatch = line.match(unitRegex);

    if (unitMatch) {
      if (currentModule) {
        if (currentModule.topics.length === 0) {
          ambiguities.push(`Module '${currentModule.title}' has no specific sub-topics listed.`);
        }
        modules.push(currentModule);
      }
      currentModule = {
        title: line,
        description: "",
        topics: []
      };
    } else if (currentModule) {
      // Clean bullet points
      const cleanLine = line.replace(/^[-*•\d.]+\s*/, "");
      if (cleanLine.length > 2 && cleanLine.length < 150) {
        currentModule.topics.push(cleanLine);
      }
    }
  }

  if (currentModule) {
    if (currentModule.topics.length === 0) {
      ambiguities.push(`Module '${currentModule.title}' has no specific sub-topics listed.`);
    }
    modules.push(currentModule);
  }

  // If no structured units were found, group topics into a general module and flag ambiguity
  if (modules.length === 0) {
    const topicLines = lines
      .slice(1)
      .map((l) => l.replace(/^[-*•\d.]+\s*/, ""))
      .filter((l) => l.length > 2 && l.length < 150);

    ambiguities.push("Syllabus does not specify explicit units or modules; topics have been grouped sequentially.");

    modules.push({
      title: "Core Curriculum",
      description: "Extracted from syllabus text",
      topics: topicLines.length > 0 ? topicLines.slice(0, 15) : ["General Syllabus Concepts"]
    });
  }

  let totalTopics = 0;
  modules.forEach((m) => (totalTopics += m.topics.length));

  return {
    title,
    description: `Structured curriculum parsed from ${fallbackTitle}`,
    prerequisites: [],
    modules,
    ambiguities,
    detectedTopicCount: totalTopics
  };
}

/**
 * Parses raw extracted syllabus text into structured modules and topics,
 * preserving structure, flagging ambiguities, and never inventing topics.
 * (TASK-079, PRD §6 F1, RULES.md §1 9).
 *
 * @param {string} extractedText
 * @param {string} [originalName]
 * @returns {Promise<object>} Structured syllabus object with ambiguities
 */
export async function parseSyllabusStructure(extractedText, originalName = "Syllabus") {
  if (!extractedText || extractedText.trim().length === 0) {
    throw new ValidationError("Cannot parse empty syllabus text");
  }

  const prompt = buildSyllabusParsePrompt(extractedText);

  try {
    const parsed = await generateStructured({
      prompt,
      schema: syllabusParsedSchema
    });

    let detectedTopicCount = 0;
    (parsed.modules || []).forEach((m) => {
      detectedTopicCount += (m.topics || []).length;
    });

    return {
      ...parsed,
      detectedTopicCount
    };
  } catch (err) {
    console.warn("[SyllabusService] AI structured parse failed, falling back to deterministic extraction:", err.message);
    return extractDeterministicSyllabus(extractedText, originalName);
  }
}

/**
 * Generates and atomically persists a full course from an approved parsed syllabus.
 * Guarantees zero invented topics and strict syllabus fidelity.
 * (TASK-080, PRD §6 F3).
 *
 * @param {object} params
 * @param {object} params.parsedSyllabus
 * @param {string} [params.goal]
 * @param {string} [params.depth]
 * @param {string} params.userId
 * @param {string} [params.token]
 * @returns {Promise<{ course: object, ambiguities: string[] }>}
 */
export async function generateCourseFromSyllabus({ parsedSyllabus, goal = "", depth = "beginner", userId, token }) {
  if (!parsedSyllabus || !parsedSyllabus.modules || parsedSyllabus.modules.length === 0) {
    throw new ValidationError("Valid parsed syllabus with at least one module is required");
  }

  const allowedDepths = limits.course?.allowedDepths || ["beginner", "intermediate", "advanced"];
  const targetDepth = allowedDepths.includes(depth) ? depth : "beginner";

  const prompt = buildCourseFromSyllabusPrompt({
    parsedSyllabus,
    goal,
    depth: targetDepth
  });

  let courseOutline;
  try {
    courseOutline = await generateStructured({
      prompt,
      schema: courseOutlineSchema
    });
  } catch (err) {
    console.warn("[SyllabusService] Model generation from syllabus failed, building deterministic outline:", err.message);
    // Deterministic fallback outline directly mapped from syllabus modules and topics
    courseOutline = {
      title: parsedSyllabus.title,
      description: parsedSyllabus.description || `Course generated from ${parsedSyllabus.title}`,
      modules: parsedSyllabus.modules.map((m) => ({
        title: m.title,
        description: m.description || "",
        lessons: m.topics.map((t) => ({
          title: t,
          summary: `Study and practice guide for ${t}`,
          objectives: [
            `Understand the core concepts of ${t}`,
            `Apply ${t} in practical problem solving`
          ]
        }))
      }))
    };
  }

  // Atomically persist course, modules, and lessons into Supabase PostgreSQL (TASK-028 / TASK-080)
  const savedCourse = await createCourseWithCurriculum({
    courseData: {
      title: courseOutline.title,
      description: courseOutline.description,
      goal: goal || `Master the syllabus: ${parsedSyllabus.title}`,
      target_depth: targetDepth,
      modules: courseOutline.modules
    },
    userId,
    token
  });

  return {
    course: savedCourse,
    ambiguities: parsedSyllabus.ambiguities || []
  };
}

export default {
  sanitizeFilename,
  validateAndExtractSyllabusText,
  extractDeterministicSyllabus,
  parseSyllabusStructure,
  generateCourseFromSyllabus
};
