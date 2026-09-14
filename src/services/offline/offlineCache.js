// AgriMobi AI — Offline cache layer (Phase 2)
//
// Persists the knowledge base's problem_categories into IndexedDB (via
// the `idb` helper) so the data is readable on later offline visits.
// This does NOT cache API responses — that's Phase 8. This only
// caches the static knowledge base data loaded in Phase 2.
//
// If IndexedDB is unavailable or caching fails for any reason (older
// browser, storage quota, private-browsing restrictions), every
// function here catches the error, logs it, and falls back to reading
// directly from the imported JSON rather than crashing the app.

import { openDB } from 'idb'
import { problem_categories as fallbackProblems } from '../knowledgeBase.js'

const DB_NAME = 'agrimobi-offline'
const DB_VERSION = 1
const STORE_NAME = 'problems'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

/**
 * Cache the full problem_categories array into IndexedDB. Intended to
 * be called once on app load (while online) so the data is available
 * offline on later visits. Safe to call multiple times — entries are
 * upserted by id.
 * @returns {Promise<boolean>} true if caching succeeded, false if it fell back
 */
export async function cacheKnowledgeBase() {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all(fallbackProblems.map((problem) => tx.store.put(problem)))
    await tx.done
    return true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('AgriMobi offline cache: failed to write to IndexedDB, will fall back to bundled JSON on read.', err)
    return false
  }
}

/**
 * Read cached problems from IndexedDB. Falls back to the imported
 * knowledgeBase.json data (via services/knowledgeBase.js) if
 * IndexedDB is unavailable, empty, or read fails for any reason.
 * @returns {Promise<Object[]>}
 */
export async function getCachedProblems() {
  try {
    const db = await getDb()
    const cached = await db.getAll(STORE_NAME)
    if (!cached || cached.length === 0) {
      return fallbackProblems
    }
    return cached
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('AgriMobi offline cache: failed to read from IndexedDB, falling back to bundled JSON.', err)
    return fallbackProblems
  }
}
