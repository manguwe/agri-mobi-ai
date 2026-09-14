// AgriMobi AI — Offline symptom matcher (Phase 8)
//
// This is a deliberately simple keyword-overlap match against cached
// knowledge base entries, used only when the app is offline and the
// real backend/mock API can't be reached. It is NOT the ML classifier
// — per the project spec, do not treat this as real classification
// logic, and never claim high confidence from it. The actual model
// arrives in a later ML phase.

// Common words that appear across almost every entry and add no
// discriminating power (stopwords + domain-generic terms every maize
// problem's symptoms mention).
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'my', 'i', 'it', 'this', 'that',
  'of', 'on', 'in', 'at', 'to', 'with', 'for', 'and', 'or', 'but',
  'has', 'have', 'had', 'be', 'been', 'being', 'there', 'some', 'any', 'can',
  'see', 'seeing', 'looks', 'look', 'like',
  'plant', 'plants', 'maize', 'leaf', 'leaves', 'crop', 'crops',
  'symptom', 'symptoms',
])

const MIN_MATCH_SCORE = 2

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
}

/**
 * Find the cached problem whose `symptoms` text has the most keyword
 * overlap with the farmer's free-text description. Returns null if
 * nothing clears the minimum overlap threshold — a missing match is
 * safer than a false one.
 * @param {string} symptomText
 * @param {Object[]} cachedProblems
 * @returns {Object|null}
 */
export function matchOffline(symptomText, cachedProblems) {
  const farmerTokens = new Set(tokenize(symptomText))
  if (farmerTokens.size === 0) return null

  let best = null
  let bestScore = 0

  for (const problem of cachedProblems || []) {
    const problemTokens = new Set(tokenize((problem.symptoms || []).join(' ')))
    let score = 0
    for (const token of farmerTokens) {
      if (problemTokens.has(token)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = problem
    }
  }

  if (!best || bestScore < MIN_MATCH_SCORE) return null
  return best
}
