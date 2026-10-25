// AgriMobi AI — shared offline-first diagnosis engine (app entry point).
// Binds the pure engine in engineCore.js to the shared rules file that the
// FastAPI backend also reads. Edit vocabulary/weights in
// src/data/diagnosisRules.json, never here.

import rules from '../data/diagnosisRules.json'
import { createEngine } from './engineCore.js'

const engine = createEngine(rules)

export const diagnose = engine.diagnose
export const detectEvidence = engine.detectEvidence
export const ENGINE_VERSION = engine.version
