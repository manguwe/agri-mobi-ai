// AgriMobi AI — diagnosis API boundary.
// The app diagnoses locally (offline-first). When VITE_USE_REMOTE_API=true the
// FastAPI service is tried first; on ANY failure (network, timeout, HTTP error,
// malformed JSON) we fall back to the local engine so a farmer is never blocked.

import { getCoreProblems } from '../knowledgeBase.js'
import { diagnose } from '../diagnosisEngine.js'

const LOCAL_DELAY_MS = 350 // short pause so the "checking" state is visible
const REMOTE_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 8000
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const USE_REMOTE_API = String(import.meta.env.VITE_USE_REMOTE_API || 'false') === 'true'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Shape the UI depends on (see App.jsx / ResultScreen / FollowUpScreen).
export function isValidDiagnosis(result) {
  return Boolean(
    result && typeof result === 'object' &&
    typeof result.status === 'string' &&
    typeof result.needs_followup === 'boolean' &&
    typeof result.confidence === 'string' &&
    Array.isArray(result.follow_up_questions) &&
    Array.isArray(result.signs_to_verify),
  )
}

async function remoteDiagnosis(payload) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop: payload?.crop || 'maize', symptoms: payload?.symptoms || '', answers: payload?.answers || {} }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Diagnosis API returned ${response.status}`)
    const data = await response.json()
    if (!isValidDiagnosis(data)) throw new Error('Diagnosis API returned an unexpected response shape')
    return data
  } finally {
    clearTimeout(timer)
  }
}

export async function submitSymptoms(payload) {
  if (USE_REMOTE_API && API_BASE_URL) {
    try {
      return { ...(await remoteDiagnosis(payload)), engine_source: 'remote' }
    } catch (error) {
      // A remote failure must never remove the offline diagnosis capability.
      console.warn('AgriMobi: remote diagnosis failed; using local engine.', error)
    }
  }

  await delay(LOCAL_DELAY_MS)
  const result = diagnose({
    symptoms: payload?.symptoms || '',
    answers: payload?.answers || {},
    problems: getCoreProblems(),
  })
  return { ...result, engine_source: 'local' }
}
