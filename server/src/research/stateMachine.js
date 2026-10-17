import { ValidationError } from "../utils/errors.js";

/**
 * Valid state transitions for research jobs.
 * Enforces strict order:
 * queued -> researching -> completed or failed
 * failed -> queued (for user-initiated retry)
 * completed is terminal.
 * (PRD §6 F2, ARCHITECTURE §8, TEST_PLAN §9).
 */
export const VALID_STATUS_TRANSITIONS = {
  queued: ["researching", "failed"],
  researching: ["completed", "failed"],
  completed: [], // Terminal state
  failed: ["queued"] // Retry allows transitioning back to queued
};

/**
 * Validates whether a state transition from `currentStatus` to `nextStatus` is allowed.
 *
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @throws {ValidationError} If transition is invalid
 * @returns {boolean} True if transition is valid
 */
export function validateStatusTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) {
    throw new ValidationError("currentStatus and nextStatus are required");
  }

  // Idempotent update to same status is allowed
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(nextStatus)) {
    throw new ValidationError(
      `Invalid research job status transition from '${currentStatus}' to '${nextStatus}'. Valid next states: [${(allowed || []).join(", ") || "none (terminal)"}].`
    );
  }

  return true;
}

export default {
  VALID_STATUS_TRANSITIONS,
  validateStatusTransition
};
