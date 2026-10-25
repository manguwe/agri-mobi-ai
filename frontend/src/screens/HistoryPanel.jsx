import { useEffect, useState } from 'react'
import { getLocalDiagnosisHistory, getCloudDiagnosisHistory, syncPendingDiagnoses } from '../services/history/diagnosisHistory.js'
import { supabase, supabaseConfigured } from '../services/supabaseClient.js'
import { getProblemById } from '../services/knowledgeBase.js'

export default function HistoryPanel({ onClose }) {
  const [records, setRecords] = useState([])
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')
  const [signedIn, setSignedIn] = useState(false)

  async function refresh() {
    setBusy(true)
    try {
      const local = await getLocalDiagnosisHistory()
      setRecords(local)
      if (supabaseConfigured && supabase) {
        const { data } = await supabase.auth.getUser()
        setSignedIn(Boolean(data?.user))
        if (data?.user) {
          const sync = await syncPendingDiagnoses()
          if (sync.synced) setMessage(`${sync.synced} pending record(s) synchronized.`)
          const cloud = await getCloudDiagnosisHistory()
          const localIds = new Set(local.map((x) => x.local_id))
          const merged = [...local, ...cloud.filter((x) => !localIds.has(x.client_record_id)).map((x) => ({
            local_id: x.client_record_id || x.id, symptoms: x.symptom_description, problem_id: x.predicted_problem_id,
            problem: getProblemById(x.predicted_problem_id)?.problem_name || null,
            confidence: x.confidence, created_at: x.created_at, synced_at: x.created_at,
            status: x.result_status, offline: x.source_mode === 'offline',
          }))]
          setRecords(merged.sort((a, b) => b.created_at.localeCompare(a.created_at)))
        }
      }
    } catch (error) {
      setMessage(error?.message || 'Could not refresh history.')
    } finally { setBusy(false) }
  }

  useEffect(() => { refresh() }, [])

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setMessage(error.message)
    else { setSignedIn(false); setMessage('Signed out. Your on-device history is retained.') }
  }

  return <section className="min-h-screen bg-white px-5 py-8">
    <div className="mx-auto max-w-md">
      <button className="mb-5 text-sm font-semibold text-green-800" onClick={onClose}>← Back</button>
      <h1 className="text-2xl font-bold text-gray-900">Diagnosis history</h1>
      <p className="mt-1 text-sm text-gray-600">Saved on this device. Sign in to synchronize records securely to your account.</p>
      {signedIn && <button onClick={signOut} className="mt-3 rounded-lg border px-3 py-2 text-sm">Sign out</button>}
      {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
      {busy ? <p className="mt-6 text-gray-600">Loading history…</p> : records.length === 0 ? <p className="mt-6 rounded-xl bg-gray-50 p-4 text-gray-700">No diagnosis records saved yet.</p> : <div className="mt-5 space-y-3">{records.map((item) => <article key={item.local_id} className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-gray-900">{item.problem || item.problem_id || 'More information needed'}</h2><span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs">{item.confidence || 'low'}</span></div>
        <p className="mt-2 text-sm text-gray-700">{item.symptoms}</p>
        <p className="mt-2 text-xs text-gray-500">{new Date(item.created_at).toLocaleString()} · {item.synced_at ? 'Synced' : 'Saved on device'}</p>
      </article>)}</div>}
      <button onClick={refresh} disabled={busy} className="mt-5 w-full rounded-xl bg-green-700 p-3 font-semibold text-white disabled:opacity-50">Refresh and sync</button>
    </div>
  </section>
}
