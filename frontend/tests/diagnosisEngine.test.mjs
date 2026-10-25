import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createEngine } from '../src/services/engineCore.js'

const read = async (rel) => JSON.parse(await readFile(new URL(rel, import.meta.url)))
const kb = await read('../src/data/knowledgeBase.json')
const rules = await read('../src/data/diagnosisRules.json')
const golden = await read('./goldenCases.json')
const problems = kb.problem_categories.filter((p) => p.mvp_status === 'core')
const { diagnose, detectEvidence } = createEngine(rules)

// 1. Every rule profile has a core KB entry, and vice versa.
assert.deepEqual(problems.map((p) => p.id).sort(), Object.keys(rules.profiles).sort(), 'rules profiles must match core KB ids')

// 2. Golden cases. backend/tests/test_diagnosis.py runs the SAME file, so a
//    passing run on both sides proves phone and API agree.
for (const c of golden) {
  const r = diagnose({ symptoms: c.symptoms, answers: c.answers, problems })
  for (const [key, expected] of Object.entries(c.expect)) {
    assert.deepEqual(r[key], expected, `${JSON.stringify(c.symptoms)} ${JSON.stringify(c.answers)} -> ${key}: got ${r[key]}, expected ${expected}`)
  }
}

// 3. Every follow-up option a farmer can tap must be understood by the engine
//    (guards against answers like "Dead central shoot" matching nothing).
const optionEvidence = { 'Yellow streaks or stripes along the veins': 'streaks', 'Round or powdery spots': 'rust_pustules', 'Long rectangular grey/brown lesions': 'rectangular', 'Yes, worms/caterpillars': 'worms', 'Yes, small insects': 'insects', 'Very dry': 'dry', 'Wet or waterlogged': 'wet', 'Older/lower leaves': 'older_leaves', 'Dead central shoot': 'dead_heart', 'Stem holes/tunnels': 'stem' }
for (const [option, feature] of Object.entries(optionEvidence)) assert.equal(detectEvidence(option)[feature], true, `follow-up option "${option}" should set ${feature}`)

// 4. Safety: unrelated words and vague input never produce a diagnosis.
for (const text of ['my maize is sick', 'the plant is robust and growing', 'my old farm has yellow leaves', 'the veins look pale']) {
  const r = diagnose({ symptoms: text, problems })
  assert.equal(r.problem_id, null, text)
  assert.equal(r.needs_followup, true, text)
}

// 5. Already-answered follow-ups that stay unclear end in a referral, not a loop.
const loop = diagnose({ symptoms: 'something is wrong', answers: { insects: 'No' }, problems })
assert.equal(loop.needs_followup, false)
assert.equal(loop.requires_extension_support, true)
assert.ok(loop.extension_message.length > 0)

console.log(`PASS: ${golden.length} golden cases, follow-up option round-trip, safety checks, no-loop referral (${rules.version})`)
