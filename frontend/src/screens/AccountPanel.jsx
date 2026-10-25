import { useState } from 'react'
import { supabase, supabaseConfigured } from '../services/supabaseClient.js'
import { syncPendingDiagnoses } from '../services/history/diagnosisHistory.js'

export default function AccountPanel({ onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!supabaseConfigured || !supabase) return
    setBusy(true); setMessage('')
    try {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) throw result.error
      if (mode === 'signup' && !result.data.session) {
        setMessage('Account created. Check your email to confirm the account, then sign in.')
      } else {
        const sync = await syncPendingDiagnoses()
        setMessage(`Signed in. ${sync.synced} saved diagnosis record(s) synchronized.`)
      }
    } catch (error) {
      setMessage(error?.message || 'Could not complete account action.')
    } finally { setBusy(false) }
  }

  if (!supabaseConfigured) return (
    <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
      <h2 className="font-bold text-amber-900">Cloud sync is not configured</h2>
      <p className="mt-1 text-sm text-amber-900">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.local after setting up your Supabase project. Diagnosis history will remain on this device meanwhile.</p>
      <button className="mt-3 rounded-lg border border-amber-700 px-4 py-2 text-amber-900" onClick={onClose}>Close</button>
    </div>
  )

  return <form onSubmit={submit} className="mt-6 rounded-xl border border-gray-200 p-4 text-left">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-bold text-gray-900">{mode === 'signup' ? 'Create an account' : 'Sign in to sync history'}</h2>
      <button type="button" onClick={onClose} className="text-sm text-gray-600">Close</button>
    </div>
    <label className="mb-1 block text-sm font-medium" htmlFor="account-email">Email</label>
    <input id="account-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3 w-full rounded-lg border p-3" />
    <label className="mb-1 block text-sm font-medium" htmlFor="account-password">Password (at least 8 characters)</label>
    <input id="account-password" type="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mb-3 w-full rounded-lg border p-3" />
    <button disabled={busy} className="w-full rounded-lg bg-green-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
    <button type="button" className="mt-3 text-sm text-green-800 underline" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
  </form>
}
