// Offline diagnosis uses the exact same deterministic engine as the online
// local path. This prevents the old keyword-only matcher from producing a
// different diagnosis simply because connectivity changed.

import { diagnose } from '../diagnosisEngine.js'

export function matchOffline(symptomText, cachedProblems, answers = {}) {
  return diagnose({ symptoms: symptomText, answers, problems: cachedProblems })
}
