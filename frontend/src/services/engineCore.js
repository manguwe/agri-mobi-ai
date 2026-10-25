// AgriMobi AI — pure diagnosis engine core (no imports, no JSON loading).
// Deterministic on purpose: agricultural guidance comes from the verified
// knowledge base; this engine only scores evidence and decides when more
// information is needed. It never invents diagnoses or treatment.
//
// All vocabulary, weights, thresholds and follow-up questions come from
// src/data/diagnosisRules.json (passed in as `rules`). The FastAPI backend
// reads the same file, so phone and server cannot drift apart.
// Keep normalize() identical to _normalize() in backend/app/diagnosis.py.

export function normalize(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function createEngine(rules) {
  const { thresholds: T, profiles: PROFILES, follow_ups: FOLLOW_UPS } = rules
  const CORE_IDS = Object.keys(PROFILES)
  const ALIASES = Object.fromEntries(
    Object.entries(rules.aliases).map(([feature, terms]) => [
      feature,
      [...new Set(terms.map(normalize).filter(Boolean))].map((term) => ` ${term} `),
    ]),
  )

  function detectEvidence(text) {
    const padded = ` ${normalize(text)} `
    const evidence = {}
    for (const [feature, terms] of Object.entries(ALIASES)) {
      evidence[feature] = terms.some((term) => padded.includes(term))
    }
    return evidence
  }

  function cleanAnswers(answers) {
    const out = {}
    for (const [key, value] of Object.entries(answers || {})) {
      if (value !== null && value !== undefined && String(value).trim() !== '') out[key] = String(value)
    }
    return out
  }

  function scoreProblem(problem, evidence) {
    const profile = PROFILES[problem.id]
    if (!profile) return { score: 0, matched: [], contradictions: 0 }
    const matched = Object.keys(profile.weights).filter((feature) => evidence[feature])
    const raw = matched.reduce((sum, feature) => sum + profile.weights[feature], 0)
    const contradictions = profile.contradictions.filter((feature) => evidence[feature]).length
    return { score: Math.max(0, raw - contradictions * T.contradiction_penalty), matched, contradictions }
  }

  function confidenceFor(best, second) {
    if (!best || best.score < T.confidence_floor) return 'low'
    const margin = best.score - (second ? second.score : 0)
    if (best.score >= T.high.score && margin >= T.high.margin) return 'high'
    if (best.score >= T.medium.score && margin >= T.medium.margin) return 'medium'
    return 'low'
  }

  function chooseFollowUps(evidence, best) {
    const questions = []
    const add = (key) => {
      const q = FOLLOW_UPS[key]
      if (q && !questions.some((x) => x.id === q.id)) questions.push(q)
    }
    if (!evidence.streaks && !evidence.rust_pustules && !evidence.rectangular) add('streaks')
    if (!evidence.insects && (best?.problem?.category || '').includes('Pest')) add('insects')
    if (evidence.yellow || evidence.rolled || evidence.stunting) add('moisture')
    if (evidence.yellow && !evidence.v_shape) add('yellow')
    if (evidence.dead_heart || evidence.stem || evidence.holes) add('dead_heart')
    return questions.slice(0, T.max_follow_ups)
  }

  function base(evidence, candidates) {
    return {
      evidence,
      candidates: candidates.slice(0, 3).map((x) => ({ id: x.problem.id, score: x.score })),
      engine_version: rules.version,
    }
  }

  function diagnose({ symptoms, answers = {}, problems = [] }) {
    const given = cleanAnswers(answers)
    const hasAnswers = Object.keys(given).length > 0
    const evidence = detectEvidence(`${symptoms || ''} ${Object.values(given).join(' ')}`)
    const candidates = (problems || [])
      .filter((p) => CORE_IDS.includes(p.id))
      .map((problem) => ({ problem, ...scoreProblem(problem, evidence) }))
      .sort((a, b) => b.score - a.score)

    const best = candidates[0]
    const confidence = confidenceFor(best, candidates[1])
    const followUps = confidence === 'low' ? chooseFollowUps(evidence, best) : []
    const tooWeak = !best || best.score < T.min_candidate_score

    if (tooWeak && hasAnswers) {
      // Follow-ups were already answered and it is still unclear. Stop asking
      // (otherwise the offline path loops forever) and send them to an expert.
      return {
        status: 'needs_more_info', needs_followup: false, confidence: 'low',
        problem_id: null, problem: null, signs_to_verify: [], guidance: '',
        follow_up_questions: [], requires_extension_support: true,
        extension_message: rules.default_extension_message,
        ...base(evidence, candidates),
      }
    }

    if (tooWeak || (confidence === 'low' && followUps.length > 0 && !hasAnswers)) {
      return {
        status: 'needs_more_info', needs_followup: true, confidence: 'low',
        problem_id: null, problem: null, signs_to_verify: [], guidance: '',
        follow_up_questions: followUps.length ? followUps : [FOLLOW_UPS.streaks, FOLLOW_UPS.insects],
        requires_extension_support: false, extension_message: '',
        ...base(evidence, candidates),
      }
    }

    const matched = best.problem
    return {
      status: 'possible_problem', needs_followup: false, confidence,
      problem_id: matched.id, problem: matched.problem_name,
      signs_to_verify: matched.verification_signs || [],
      guidance: matched.recommended_action || '',
      follow_up_questions: [], requires_extension_support: confidence === 'low',
      extension_message: matched.when_to_contact_extension_worker || rules.default_extension_message,
      ...base(evidence, candidates),
    }
  }

  return { diagnose, detectEvidence, version: rules.version }
}
