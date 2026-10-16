import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";
import { coursesRouter } from "./routes/courses.routes.js";
import { lessonsRouter } from "./routes/lessons.routes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { NotFoundError } from "./utils/errors.js";

export const app = express();

// Security and standard middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json());

// Public API Routes
app.use("/api", healthRouter);

// Courses API Routes (TASK-029, TASK-030)
app.use("/api", coursesRouter);

// Lessons API Routes (TASK-036)
app.use("/api", lessonsRouter);

// Protected User Route (TASK-020)
app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.user_metadata?.full_name || req.user.email?.split("@")[0],
      createdAt: req.user.created_at
    }
  });
});

// Catch-all for undefined routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);

export default app;
