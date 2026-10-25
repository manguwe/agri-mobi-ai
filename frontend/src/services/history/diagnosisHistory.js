import { openDB } from 'idb'
import { supabase, supabaseConfigured } from '../supabaseClient.js'

const DB_NAME = 'agrimobi-offline'
const DB_VERSION = 2
const HISTORY_STORE = 'diagnoses'

async function db() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('problems')) database.createObjectStore('problems', { keyPath: 'id' })
      if (!database.objectStoreNames.contains(HISTORY_STORE)) database.createObjectStore(HISTORY_STORE, { keyPath: 'local_id' })
    },
  })
}

function asDatabaseRow(record, userId) {
  return {
    user_id: userId,
    client_record_id: record.local_id,
    farm_id: record.farm_id || null,
    crop: record.crop || 'maize',
    symptom_description: record.symptoms,
    answers: record.answers || {},
    result_status: record.status === 'needs_more_info' ? 'needs_more_info' : 'possible_problem',
    predicted_problem_id: record.problem_id || null,
    confidence: ['high', 'medium', 'low'].includes(record.confidence) ? record.confidence : 'low',
    candidate_scores: record.candidates || [],
    engine_version: record.engine_version || 'rules-v2',
    source_mode: record.offline ? 'offline' : 'online',
    requires_extension_support: Boolean(record.requires_extension_support),
  }
}

export async function saveDiagnosisLocally({ symptoms, answers = {}, result, crop = 'maize', farm_id = null }) {
  const local_id = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const record = {
    local_id, symptoms, answers, crop, farm_id,
    status: result?.status || 'needs_more_info',
    problem_id: result?.problem_id || null,
    problem: result?.problem || null,
    confidence: result?.confidence || 'low',
    candidates: result?.candidates || [],
    engine_version: result?.engine_version || null,
    requires_extension_support: Boolean(result?.requires_extension_support),
    offline: Boolean(result?.offline),
    created_at: new Date().toISOString(),
    synced_at: null,
    account_id: null,
  }
  const database = await db()
  await database.put(HISTORY_STORE, record)
  return record
}

export async function getLocalDiagnosisHistory() {
  try {
    const database = await db()
    return (await database.getAll(HISTORY_STORE)).sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch (error) {
    console.warn('AgriMobi: local history is unavailable on this device.', error)
    return []
  }
}

async function runSync() {
  if (!supabaseConfigured || !supabase) return { synced: 0, reason: 'not_configured' }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return { synced: 0, reason: 'not_signed_in' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { synced: 0, reason: 'offline' }

  const database = await db()
  const pending = (await database.getAll(HISTORY_STORE)).filter((item) => !item.synced_at && (!item.account_id || item.account_id === userData.user.id))
  let synced = 0
  for (const record of pending) {
    const row = asDatabaseRow(record, userData.user.id)
    const { error } = await supabase.from('diagnoses').upsert(row, { onConflict: 'client_record_id' })
    if (error) {
      // Leave the record queued. Missing knowledge-item seeds, RLS, or network
      // issues must not delete the local history entry.
      console.warn('AgriMobi: diagnosis sync deferred; record remains on device.', error.message)
      continue
    }
    await database.put(HISTORY_STORE, { ...record, account_id: userData.user.id, synced_at: new Date().toISOString() })
    synced += 1
  }
  return { synced, reason: 'complete' }
}

// Sync is triggered from several places at once (app start, the 'online'
// event, after each diagnosis, History/Account screens). Run one pass at a
// time; if another trigger arrives mid-pass, do one more pass afterwards so
// a record saved during the pass is not left waiting for the next trigger.
let inFlight = null
let rerun = false
export function syncPendingDiagnoses() {
  if (inFlight) {
    rerun = true
    return inFlight
  }
  inFlight = (async () => {
    try {
      let total = 0
      let last
      do {
        rerun = false
        last = await runSync()
        total += last.synced
      } while (rerun && last.reason === 'complete')
      return { ...last, synced: total }
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export async function getCloudDiagnosisHistory(limit = 50) {
  if (!supabaseConfigured || !supabase) return []
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return []
  const { data, error } = await supabase.from('diagnoses')
    .select('id,client_record_id,crop,symptom_description,result_status,predicted_problem_id,confidence,source_mode,created_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
