// AgriMobi AI — useConnectivity hook (Phase 8)
//
// Subscribes components to connectivity status: an initial check on
// mount, a lightweight periodic re-check, and an immediate re-check
// whenever the browser fires 'online'/'offline' events (those events
// reflect adapter changes, which is a good moment to re-verify real
// reachability rather than trust the event alone).

import { useState, useEffect, useCallback, useRef } from 'react'
import { isReallyOnline } from '../services/offline/connectivity.js'

const POLL_INTERVAL_MS = 20000

/**
 * @returns {boolean} true if the app currently believes it has real
 * internet reachability, false otherwise.
 */
export function useConnectivity() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const mountedRef = useRef(true)

  const check = useCallback(async () => {
    const result = await isReallyOnline()
    if (mountedRef.current) setOnline(result)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    check()

    const interval = setInterval(check, POLL_INTERVAL_MS)
    window.addEventListener('online', check)
    window.addEventListener('offline', check)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      window.removeEventListener('online', check)
      window.removeEventListener('offline', check)
    }
  }, [check])

  return online
}

export default useConnectivity
