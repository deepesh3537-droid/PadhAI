import * as masteryRepo from "../db/repositories/mastery.repository.js";
import { ValidationError } from "../utils/errors.js";

/**
 * DECAY_FACTOR: Controls how much recent evidence is weighted over older attempts.
 * gamma = 0.85 means the most recent answer is given full weight (1.0),
 * the previous has weight 0.85, the one before 0.72, etc.
 */
const RECENCY_DECAY = 0.85;

/**
 * Calculates updated topic mastery using a recency-weighted exponential moving average
 * and evidence-count confidence bands.
 * (PRD §6 F6, RULES §3, TEST_PLAN §7).
 *
 * Mathematical Formula:
 * For N evidence items ordered from oldest to newest:
 * weight_i = (RECENCY_DECAY)^(N - i)
 * Weighted Score = ( sum(weight_i * correct_i) / sum(weight_i) ) * 100
 *
 * Uncertainty & Evidence Principles:
 * - A single wrong answer (N = 1) MUST NOT classify a topic as "Weak" or "Needs Revision".
 *   It is marked as "Assessing (Insufficient evidence)".
 * - Minimum 2 evidence points are required before assigning a definitive mastery tier.
 *
 * @param {object} params
 * @param {Array} [params.existingHistory=[]] - Historical results [{ isCorrect: boolean, timestamp: string }]
 * @param {boolean} params.newIsCorrect - Whether the latest question was answered correctly
 * @returns {object} Calculated score, counts, tier, and human-friendly uncertainty wording
 */
export function calculateTopicMastery({ existingHistory = [], newIsCorrect }) {
  const history = [
    ...existingHistory,
    {
      isCorrect: Boolean(newIsCorrect),
      timestamp: new Date().toISOString()
    }
  ];

  const totalN = history.length;
  let correctCount = 0;
  let weightedSum = 0;
  let totalWeights = 0;

  for (let i = 0; i < totalN; i++) {
    const item = history[i];
    if (item.isCorrect) correctCount++;

    // Recency weight: newest item has exponent 0 (weight = 1.0)
    const weight = Math.pow(RECENCY_DECAY, totalN - 1 - i);
    weightedSum += (item.isCorrect ? 1.0 : 0.0) * weight;
    totalWeights += weight;
  }

  const rawPercentage = totalWeights > 0 ? (weightedSum / totalWeights) * 100 : 0;
  const masteryScore = Math.round(rawPercentage * 10) / 10; // 1 decimal place

  // Determine Confidence and Uncertainty Wording (PRD §6 F6 / TEST_PLAN §7)
  let confidence = "low";
  let confidenceLabel = "Preliminary estimate";
  let tier = "assessing";
  let wording = "";

  if (totalN < 2) {
    confidence = "low";
    confidenceLabel = "Preliminary (insufficient evidence)";
    tier = "assessing";
    wording = `Estimated mastery: Assessing (based on ${totalN} answer — preliminary estimate, need more questions)`;
  } else if (totalN < 5) {
    confidence = "medium";
    confidenceLabel = "Moderate evidence";
    if (masteryScore >= 80) {
      tier = "proficient";
      wording = `Estimated mastery: High (based on ${totalN} answers)`;
    } else if (masteryScore >= 55) {
      tier = "developing";
      wording = `Estimated mastery: Medium (based on ${totalN} answers)`;
    } else {
      tier = "needs_practice";
      wording = `Estimated mastery: Developing (based on ${totalN} answers — practice suggested)`;
    }
  } else {
    confidence = "high";
    confidenceLabel = "Strong evidence";
    if (masteryScore >= 80) {
      tier = "proficient";
      wording = `Estimated mastery: High (based on ${totalN} answers)`;
    } else if (masteryScore >= 60) {
      tier = "developing";
      wording = `Estimated mastery: Medium (based on ${totalN} answers)`;
    } else {
      tier = "needs_practice";
      wording = `Estimated mastery: Review needed (based on ${totalN} answers)`;
    }
  }

  return {
    masteryScore,
    evidenceCount: totalN,
    correctCount,
    history,
    tier,
    confidence,
    confidenceLabel,
    wording
  };
}

/**
 * Updates topic mastery records from a submitted quiz attempt.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.courseId
 * @param {string} params.lessonTitle
 * @param {Array} params.questionResults - Itemized question results from quiz service
 * @param {string} [params.token]
 * @returns {Promise<Array>} List of updated topic mastery records
 */
export async function recordMasteryFromQuizAttempt({
  userId,
  courseId,
  lessonTitle,
  questionResults = [],
  token
}) {
  if (!userId || !courseId) {
    throw new ValidationError("userId and courseId are required");
  }

  if (!Array.isArray(questionResults) || questionResults.length === 0) {
    return [];
  }

  // Group evidence by topic (defaults to lessonTitle)
  const topicName = lessonTitle || "General Lesson Concepts";

  const existingRecord = await masteryRepo.findMasteryByTopic(userId, courseId, topicName, token);
  let currentHistory = existingRecord?.history || [];

  for (const q of questionResults) {
    const calc = calculateTopicMastery({
      existingHistory: currentHistory,
      newIsCorrect: q.isCorrect
    });
    currentHistory = calc.history;
  }

  const finalCalc = calculateTopicMastery({
    existingHistory: existingRecord?.history || [],
    newIsCorrect: questionResults[questionResults.length - 1].isCorrect
  });

  // Re-run pure calculation across all accumulated history items
  let accumulatedHistory = existingRecord?.history || [];
  let lastCalc = null;
  for (const q of questionResults) {
    lastCalc = calculateTopicMastery({
      existingHistory: accumulatedHistory,
      newIsCorrect: q.isCorrect
    });
    accumulatedHistory = lastCalc.history;
  }

  const saved = await masteryRepo.upsertTopicMastery(
    {
      userId,
      courseId,
      topic: topicName,
      masteryScore: lastCalc.masteryScore,
      evidenceCount: lastCalc.evidenceCount,
      correctCount: lastCalc.correctCount,
      history: lastCalc.history,
      lastAssessedAt: new Date().toISOString(),
      token
    },
    token
  );

  return [saved];
}

/**
 * Retrieves mastery breakdown for all topics in a course with human-friendly
 * confidence and uncertainty wording.
 * (PRD §6 F6, DESIGN §3.8).
 *
 * @param {string} userId
 * @param {string} courseId
 * @param {string} [token]
 * @returns {Promise<Array>}
 */
export async function getCourseMasteryBreakdown(userId, courseId, token) {
  const records = await masteryRepo.findMasteryByUserAndCourse(userId, courseId, token);

  return records.map((rec) => {
    // Determine presentation metadata
    const n = rec.evidence_count || 0;
    const score = Number(rec.mastery_score) || 0;

    let tier = "assessing";
    let confidence = "low";
    let confidenceLabel = "Preliminary (insufficient evidence)";
    let wording = `Estimated mastery: Assessing (based on ${n} answers — insufficient evidence)`;

    if (n >= 2) {
      if (score >= 80) {
        tier = "proficient";
        confidence = n >= 5 ? "high" : "medium";
        confidenceLabel = n >= 5 ? "Strong evidence" : "Moderate evidence";
        wording = `Estimated mastery: High (based on ${n} answers)`;
      } else if (score >= 55) {
        tier = "developing";
        confidence = n >= 5 ? "high" : "medium";
        confidenceLabel = n >= 5 ? "Strong evidence" : "Moderate evidence";
        wording = `Estimated mastery: Medium (based on ${n} answers)`;
      } else {
        tier = "needs_practice";
        confidence = n >= 5 ? "high" : "medium";
        confidenceLabel = n >= 5 ? "Strong evidence" : "Moderate evidence";
        wording = `Estimated mastery: Practice suggested (based on ${n} answers)`;
      }
    }

    return {
      id: rec.id,
      topic: rec.topic,
      masteryScore: score,
      evidenceCount: n,
      correctCount: rec.correct_count || 0,
      tier,
      confidence,
      confidenceLabel,
      wording,
      lastAssessedAt: rec.last_assessed_at
    };
  });
}

/**
/**
 * Pure calculation helper to generate revision recommendations from topic records.
 * (TASK-062, PRD §6 F7).
 *
 * @param {Array} records - Topic mastery records
 * @returns {Array} Prioritized recommendations
 */
export function calculateRevisionRecommendationsFromRecords(records = []) {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const recommendations = [];

  for (const rec of records) {
    const score = Number(rec.mastery_score) || 0;
    const n = rec.evidence_count || 0;
    const lastDate = new Date(rec.last_assessed_at || Date.now()).getTime();
    const daysSince = Math.floor((now - lastDate) / ONE_DAY_MS);

    // Rule 1: Needs review based on evidence (N >= 2)
    if (n >= 2 && score < 70) {
      recommendations.push({
        topic: rec.topic,
        reason: `Your estimated mastery is ${score}% across ${n} quiz questions. A quick practice round will reinforce this concept.`,
        priority: score < 50 ? "high" : "medium",
        masteryScore: score,
        evidenceCount: n,
        type: "practice_needed"
      });
      continue;
    }

    // Rule 2: Spaced repetition refresher (decay after 5+ days)
    if (n >= 2 && daysSince >= 5 && score < 85) {
      recommendations.push({
        topic: rec.topic,
        reason: `Last studied ${daysSince} days ago. Refreshing now strengthens long-term memory.`,
        priority: "low",
        masteryScore: score,
        evidenceCount: n,
        type: "spaced_repetition"
      });
    }
  }

  // Sort: High priority first, then lowest score
  recommendations.sort((a, b) => {
    const pWeight = { high: 3, medium: 2, low: 1 };
    if (pWeight[b.priority] !== pWeight[a.priority]) {
      return pWeight[b.priority] - pWeight[a.priority];
    }
    return a.masteryScore - b.masteryScore;
  });

  return recommendations;
}

/**
 * Generates explainable, evidence-based revision recommendations.
 * (TASK-062, PRD §6 F7).
 *
 * @param {string} userId
 * @param {string} courseId
 * @param {string} [token]
 * @returns {Promise<Array>} List of prioritized recommendation objects
 */
export async function getRevisionRecommendations(userId, courseId, token) {
  const records = await masteryRepo.findMasteryByUserAndCourse(userId, courseId, token);
  return calculateRevisionRecommendationsFromRecords(records);
}

export default {
  calculateTopicMastery,
  recordMasteryFromQuizAttempt,
  getCourseMasteryBreakdown,
  calculateRevisionRecommendationsFromRecords,
  getRevisionRecommendations
};
