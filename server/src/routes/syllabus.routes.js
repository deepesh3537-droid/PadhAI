import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { syllabusRateLimiter } from "../middleware/rateLimit.js";
import { limits } from "../config/limits.js";
import {
  validateAndExtractSyllabusText,
  parseSyllabusStructure,
  generateCourseFromSyllabus
} from "../services/syllabus.service.js";
import { ValidationError } from "../utils/errors.js";

export const syllabusRouter = Router();

// Configure Multer with strictly in-memory storage (SECURITY §9 / ADR-020)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: limits.syllabus?.maxFileSizeBytes || 5 * 1024 * 1024
  }
});

// Middleware to handle multer file size error cleanly with a friendly message
const handleMulterUpload = (req, res, next) => {
  upload.single("syllabus")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ValidationError("File size exceeds the 5 MB limit. Please upload a smaller document."));
      }
      return next(new ValidationError(`Upload error: ${err.message}`));
    }
    next();
  });
};

/**
 * POST /api/syllabus/extract
 * Extracts text from an uploaded syllabus file (.pdf, .txt, .md).
 * Supports both multipart/form-data file uploads and JSON payload ({ filename, contentBase64 } or { filename, text }).
 * (TASK-077, TASK-078, SECURITY §9, TEST_PLAN §10).
 */
syllabusRouter.post("/syllabus/extract", requireAuth, syllabusRateLimiter, handleMulterUpload, async (req, res, next) => {
  try {
    let buffer = null;
    let originalName = "syllabus.txt";
    let mimeType = "text/plain";

    if (req.file) {
      buffer = req.file.buffer;
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.body?.contentBase64) {
      buffer = Buffer.from(req.body.contentBase64, "base64");
      originalName = req.body.filename || "syllabus.pdf";
      mimeType = req.body.mimeType || "application/octet-stream";
    } else if (req.body?.text) {
      buffer = Buffer.from(req.body.text, "utf-8");
      originalName = req.body.filename || "syllabus.txt";
      mimeType = "text/plain";
    } else {
      throw new ValidationError("No file or text payload provided for extraction");
    }

    const extracted = await validateAndExtractSyllabusText({
      buffer,
      originalName,
      mimeType
    });

    res.json({
      success: true,
      filename: extracted.originalName,
      charCount: extracted.charCount,
      text: extracted.text
    });
  } catch (err) {
    next(err);
  }
});

const parseBodySchema = z.object({
  text: z.string().min(1, "Syllabus text is required"),
  filename: z.string().optional().default("Syllabus")
});

/**
 * POST /api/syllabus/parse
 * Parses extracted text into structured modules and topics, detecting ambiguities without inventing topics.
 * (TASK-079, PRD §6 F1).
 */
syllabusRouter.post("/syllabus/parse", requireAuth, syllabusRateLimiter, async (req, res, next) => {
  try {
    const parseResult = parseBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid parse payload: " + parseResult.error.issues[0]?.message);
    }

    const { text, filename } = parseResult.data;
    const parsedSyllabus = await parseSyllabusStructure(text, filename);

    res.json({
      success: true,
      parsedSyllabus
    });
  } catch (err) {
    next(err);
  }
});

const generateFromSyllabusSchema = z.object({
  parsedSyllabus: z.object({
    title: z.string().min(1),
    description: z.string().optional().default(""),
    prerequisites: z.array(z.string()).optional().default([]),
    modules: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional().default(""),
        topics: z.array(z.string().min(1)).min(1)
      })
    ).min(1, "At least one module is required"),
    ambiguities: z.array(z.string()).optional().default([])
  }),
  goal: z.string().optional().default(""),
  depth: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner")
});

/**
 * POST /api/syllabus/generate
 * Generates and atomically persists a full course from an approved parsed syllabus.
 * (TASK-080, PRD §6 F3).
 */
syllabusRouter.post("/syllabus/generate", requireAuth, syllabusRateLimiter, async (req, res, next) => {
  try {
    const validation = generateFromSyllabusSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError("Invalid syllabus course generation payload: " + validation.error.issues[0]?.message);
    }

    const { parsedSyllabus, goal, depth } = validation.data;

    const result = await generateCourseFromSyllabus({
      parsedSyllabus,
      goal,
      depth,
      userId: req.user.id,
      token: req.token
    });

    res.status(201).json({
      course: result.course,
      ambiguities: result.ambiguities,
      message: "Course generated from syllabus successfully"
    });
  } catch (err) {
    next(err);
  }
});

export default syllabusRouter;
