// AgriMobi AI — API client (Phase 1: mock only)
//
// This is the ONLY place in the app that will ever call the real
// FastAPI backend. No other file should hardcode a request URL or
// assume a response shape — everything else imports submitSymptoms()
// from here.
//
// Phase 1: no backend exists yet, so this returns a hardcoded mock
// response shaped like what the real /api/predict endpoint will send.
// Swapping in the real fetch() call later should not require changes
// anywhere else in the app.
//
// Phase 2: the mock response's `problem` field is now sourced from a
// real entry in the knowledge base instead of a made-up string. The
// rest of the response (confidence, signs_to_verify, guidance) is
// still hardcoded/mock — real classification logic is a later phase.
//
// Phase 3: the mock now has two stages so the follow-up screen and
// all three confidence levels can be exercised in the prototype.
// First call (no answers yet) always asks a follow-up question.
// Second call (answers present) picks a confidence level from the
// answer given — still entirely mocked/hardcoded, not real
// classification.

import { getProblemById } from '../knowledgeBase.js'

// Fall Armyworm — used as the mock's stand-in "match" since it's the
// same problem the Phase 1 placeholder used. Swap freely; this has no
// bearing on real classification later.
const MOCK_MATCH_ID = 'faw-001'

// Hardcoded example follow-up questions for the prototype. Shape
// matches the follow-up question structure described in the project
// spec. Real question selection (based on competing diagnoses) is a
// later phase.
const MOCK_FOLLOW_UP_QUESTIONS = [
  {
    id: 'visible_insects',
    question: 'Can you see insects or worms on the affected plant?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Not sure'],
  },
  {
    id: 'leaf_pattern',
    question: "What do the marks on the leaves look like?",
    type: 'single_choice',
    options: ['Holes or chewed edges', 'Streaks or stripes', 'Spots or patches', 'Not sure'],
  },
]

/**
 * Submit a farmer's symptom description (and any follow-up answers)
 * for classification.
 *
 * @param {Object} payload
 * @param {string} payload.crop - e.g. "maize"
 * @param {string} payload.symptoms - free-text symptom description
 * @param {Object} [payload.answers] - follow-up question answers, if any
 * @returns {Promise<Object>} prediction response
 */
export async function submitSymptoms(payload) {
  // TODO (later phase): replace with a real call to the FastAPI
  // backend, e.g.:
  //
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/predict`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // })
  // if (!res.ok) throw new Error('Prediction request failed')
  // return res.json()

  const { answers } = payload || {}
  const hasAnswers = answers && Object.keys(answers).length > 0

  // Stage 1: symptoms just submitted, no follow-up answers yet.
  // The mock always asks for more info at this stage so the
  // follow-up screen is reachable in the prototype.
  if (!hasAnswers) {
    return Promise.resolve({
      status: 'needs_more_info',
      needs_followup: true,
      confidence: 'medium',
      problem_id: null,
      problem: null,
      signs_to_verify: [],
      guidance: '',
      follow_up_questions: MOCK_FOLLOW_UP_QUESTIONS,
      requires_extension_support: false,
      extension_message: '',
    })
  }

  // Stage 2: follow-up answers are in. Confidence/outcome is picked
  // from the "visible_insects" answer purely to demonstrate all three
  // uncertainty levels in the prototype — this is still mocked, not
  // real classification.
  let confidence
  let problemId
  if (answers.visible_insects === 'Yes') {
    confidence = 'high'
    problemId = MOCK_MATCH_ID
  } else if (answers.visible_insects === 'Not sure') {
    confidence = 'medium'
    problemId = MOCK_MATCH_ID
  } else {
    confidence = 'low'
    problemId = null
  }

  const matchedProblem = problemId ? getProblemById(problemId) : null

  return Promise.resolve({
    status: matchedProblem ? 'possible_problem' : 'insufficient_info',
    needs_followup: false,
    confidence,
    problem_id: problemId,
    problem: matchedProblem ? matchedProblem.problem_name : null,
    signs_to_verify: matchedProblem ? matchedProblem.verification_signs : [],
    guidance: matchedProblem
      ? matchedProblem.recommended_action
      : 'We could not narrow this down with confidence from the information given.',
    follow_up_questions: [],
    requires_extension_support: confidence === 'low',
    extension_message: matchedProblem
      ? matchedProblem.when_to_contact_extension_worker
      : 'Please describe the symptoms to your local agricultural extension officer so they can inspect the crop in person.',
  })
}
