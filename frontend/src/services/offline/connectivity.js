// AgriMobi AI — Connectivity check (Phase 8)
//
// navigator.onLine only reflects whether the device's network adapter
// is connected to *something* (e.g. a Wi-Fi router) — it can still
// report `true` with no actual internet reachability (a common case
// on rural connections). isReallyOnline() combines it with a short,
// same-origin network ping to get a more honest answer.
//
// Note: the ping deliberately bypasses the service worker's app-shell
// cache (see the `?ping=` bypass in public/sw.js) — otherwise a
// cached response would make this always report "online" even with
// no internet at all.

const PING_URL = '/manifest.json'
const PING_TIMEOUT_MS = 3000

async function pingNetwork(timeoutMs = PING_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${PING_URL}?ping=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    return response.ok
  } catch {
    // Covers both a real network failure and the abort timeout.
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Best-effort check of real internet reachability, not just adapter
 * status. If the adapter itself reports offline, trust that
 * immediately and skip the network round-trip. If the check itself
 * fails unexpectedly, default to assuming offline — it's safer to
 * serve cached data than to hang waiting on a failing network call.
 * @returns {Promise<boolean>}
 */
export async function isReallyOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false
  }

  try {
    return await pingNetwork()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('AgriMobi connectivity check failed unexpectedly, assuming offline.', err)
    return false
  }
}
