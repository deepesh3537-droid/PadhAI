import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getLessonQuizForLearner,
  getOrCreateLessonQuiz,
  submitQuizAttempt
} from "../services/quiz.service.js";

export const quizzesRouter = Router();

/**
 * GET /api/lessons/:id/quiz
 * Fetches or generates a lesson quiz with answer keys and explanations stripped.
 * Also returns user's historical attempts for this quiz.
 * (SECURITY §28, ARCHITECTURE §219, TEST_PLAN §6).
 */
quizzesRouter.get("/lessons/:id/quiz", requireAuth, async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const forceRegenerate = req.query.regenerate === "true";

    if (forceRegenerate) {
      await getOrCreateLessonQuiz({
        lessonId,
        token: req.token,
        forceRegenerate: true
      });
    }

    const { quiz, attempts } = await getLessonQuizForLearner({
      lessonId,
      userId: req.user.id,
      token: req.token
    });

    res.json({ quiz, attempts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/quizzes/:id/attempts
 * Submits learner answers for deterministic grading and saves the attempt.
 */
quizzesRouter.post("/quizzes/:id/attempts", requireAuth, async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;

    const attempt = await submitQuizAttempt({
      quizId,
      userId: req.user.id,
      answers,
      token: req.token
    });

    res.status(201).json({
      success: true,
      attempt
    });
  } catch (err) {
    next(err);
  }
});

export default quizzesRouter;
