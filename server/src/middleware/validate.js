import { ValidationError } from "../utils/errors.js";

/**
 * Express middleware factory for validating request bodies against a Zod schema.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message
      }));
      return next(new ValidationError("Invalid request body", issues));
    }
    req.body = result.data;
    next();
  };
}

export default validateBody;
