// AgriMobi AI — Knowledge base service (Phase 2)
//
// Thin read layer over src/data/knowledgeBase.json. This is the
// source of truth for problem data in the frontend for now; when the
// real backend exists, this data will likely move server-side, but
// that's a future migration, not this phase's concern.
//
// Entries with a "confidence_note" field (lower regional certainty,
// e.g. Shoot Fly) are NOT dropped — they're valid data — but callers
// that rank or surface likely matches should treat them as
// lower-priority. See isLowerConfidence() below.

import knowledgeBaseRaw from '../data/knowledgeBase.json'

function validate(data) {
  if (!data || !Array.isArray(data.problem_categories) || data.problem_categories.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      'AgriMobi knowledge base failed validation: problem_categories is missing, not an array, or empty.'
    )
    return { problem_categories: [], agronomic_reference: null }
  }
  return data
}

const knowledgeBase = validate(knowledgeBaseRaw)

/** Full list of problem categories (core + extra), as loaded from JSON. */
export const problem_categories = knowledgeBase.problem_categories

/**
 * Look up a single problem by its id (e.g. "faw-001").
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getProblemById(id) {
  return problem_categories.find((problem) => problem.id === id)
}

/**
 * Only the 8 MVP core problems (mvp_status === "core").
 * @returns {Object[]}
 */
export function getCoreProblems() {
  return problem_categories.filter((problem) => problem.mvp_status === 'core')
}

/**
 * General maize agronomy background (planting window, fertilizer
 * guidance, etc.) — not tied to a specific problem diagnosis.
 * @returns {Object|null}
 */
export function getAgronomicReference() {
  return knowledgeBase.agronomic_reference
}

/**
 * True if this entry carries a confidence_note (lower regional
 * certainty). Ranking/surfacing logic should treat these as
 * lower-priority rather than dropping them.
 * @param {Object} problem
 * @returns {boolean}
 */
export function isLowerConfidence(problem) {
  return Boolean(problem && problem.confidence_note)
}
