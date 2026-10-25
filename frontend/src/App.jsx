import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EntryScreen from './screens/EntryScreen.jsx'
import SymptomInputScreen from './screens/SymptomInputScreen.jsx'
import FollowUpScreen from './screens/FollowUpScreen.jsx'
import ResultScreen from './screens/ResultScreen.jsx'
import KnowledgeListScreen from './screens/KnowledgeListScreen.jsx'
import KnowledgeDetailScreen from './screens/KnowledgeDetailScreen.jsx'
import AccountPanel from './screens/AccountPanel.jsx'
import HistoryPanel from './screens/HistoryPanel.jsx'
import ConnectivityBanner from './components/ConnectivityBanner.jsx'
import { useConnectivity } from './hooks/useConnectivity.js'
import { submitSymptoms } from './services/api/client.js'
import { isReallyOnline } from './services/offline/connectivity.js'
import { getCachedProblems } from './services/offline/offlineCache.js'
import { matchOffline } from './services/offline/offlineMatch.js'
import { problem_categories, getProblemById } from './services/knowledgeBase.js'
import { saveDiagnosisLocally, syncPendingDiagnoses } from './services/history/diagnosisHistory.js'

// Offline and local-online diagnosis share the same deterministic engine.
// The offline result is only annotated so the UI can explain the mode.
const OFFLINE_MATCH_DELAY_MS = 350
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildOfflineResult(result) {
  return { ...result, offline: true }
}

// The farmer flow (entry -> symptoms -> optional follow-up -> result)
// is a single linear wizard, not a set of independently-navigable
// pages, so it's driven by local state rather than separate routes.
// BrowserRouter/Routes is kept as the outer shell so future screens
// that DO need their own URL (Extension Support, Knowledge Library)
// can be added as routes later without restructuring this file.
function FarmerFlow() {
  const [step, setStep] = useState('entry') // farmer flow and account/history panels
  const [symptoms, setSymptoms] = useState('')
  const [followUpQuestions, setFollowUpQuestions] = useState([])
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProblemId, setSelectedProblemId] = useState(null)
  const online = useConnectivity()

  useEffect(() => {
    const sync = () => { syncPendingDiagnoses().catch((error) => console.warn('AgriMobi sync deferred.', error)) }
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])

  async function finishDiagnosis(response, symptomText, answers = {}) {
    setResult(response)
    setStep('result')
    try {
      await saveDiagnosisLocally({ symptoms: symptomText, answers, result: response, crop: 'maize' })
      await syncPendingDiagnoses()
    } catch (error) {
      console.warn('AgriMobi: diagnosis shown but history save was unavailable.', error)
    }
  }

  function reset() {
    setStep('entry')
    setSymptoms('')
    setFollowUpQuestions([])
    setResult(null)
    setSubmitting(false)
    setSelectedProblemId(null)
  }

  function handleSelectProblem(id) {
    setSelectedProblemId(id)
    setStep('knowledge-detail')
  }

  // Runs the same diagnosis engine locally, using the cached knowledge base.
  async function runOfflineMatch(symptomText, answers = {}) {
    const cachedProblems = await getCachedProblems()
    await delay(OFFLINE_MATCH_DELAY_MS)
    const response = matchOffline(symptomText, cachedProblems, answers)
    if (response.needs_followup) {
      setFollowUpQuestions(response.follow_up_questions || [])
      setStep('followup')
      return
    }
    await finishDiagnosis(buildOfflineResult(response), symptomText, answers)
  }

  async function handleSymptomSubmit(text) {
    setSymptoms(text)
    setSubmitting(true)
    try {
      // Check connectivity fresh at submit time (rather than relying
      // on the banner's periodic state) before deciding which path to
      // take — this is the actual online/offline routing decision.
      const reallyOnline = await isReallyOnline()

      if (!reallyOnline) {
        await runOfflineMatch(text)
        return
      }

      const response = await submitSymptoms({ crop: 'maize', symptoms: text, answers: {} })
      if (!response || typeof response !== 'object') {
        throw new Error('Unexpected response shape from submitSymptoms')
      }
      if (response.needs_followup) {
        setFollowUpQuestions(response.follow_up_questions || [])
        setStep('followup')
      } else {
        await finishDiagnosis(response, text, {})
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('AgriMobi: submitSymptoms failed', err)
      setStep('error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFollowUpSubmit(answers) {
    setSubmitting(true)
    try {
      // Connectivity can change mid-session (e.g. between symptom
      // submission and answering follow-ups). Re-check rather than
      // assume the online path from earlier still applies. The
      // offline path has no follow-up questions of its own, so it
      // re-matches on the original symptom text.
      const reallyOnline = await isReallyOnline()

      if (!reallyOnline) {
        await runOfflineMatch(symptoms, answers)
        return
      }

      const response = await submitSymptoms({ crop: 'maize', symptoms, answers })
      if (!response || typeof response !== 'object') {
        throw new Error('Unexpected response shape from submitSymptoms')
      }
      await finishDiagnosis(response, symptoms, answers)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('AgriMobi: submitSymptoms failed', err)
      setStep('error')
    } finally {
      setSubmitting(false)
    }
  }

  let screen
  if (step === 'entry') {
    screen = <EntryScreen onStart={() => setStep('symptom')} onBrowse={() => setStep('knowledge-list')} onAccount={() => setStep('account')} onHistory={() => setStep('history')} />
  } else if (step === 'account') {
    screen = <div className="min-h-screen bg-white px-6 py-10"><div className="mx-auto max-w-md"><button className="text-sm font-semibold text-green-800" onClick={() => setStep('entry')}>← Back</button><h1 className="mt-4 text-2xl font-bold">AgriMobi account</h1><p className="mt-2 text-sm text-gray-600">Create an account or sign in to sync diagnosis history across devices. Core diagnosis remains available offline.</p><AccountPanel onClose={() => setStep('entry')} /></div></div>
  } else if (step === 'history') {
    screen = <HistoryPanel onClose={() => setStep('entry')} />
  } else if (step === 'knowledge-list') {
    // Reads straight from the bundled knowledge base data (via
    // services/knowledgeBase.js), same as the Result screen's data
    // ultimately traces back to — this works identically online or
    // offline since it's bundled into the JS, not fetched over the
    // network. No dependency on the Phase 8 IndexedDB cache needed
    // for this read-only reference view.
    screen = (
      <KnowledgeListScreen
        problems={problem_categories}
        onSelect={handleSelectProblem}
        onBack={() => setStep('entry')}
      />
    )
  } else if (step === 'knowledge-detail') {
    screen = (
      <KnowledgeDetailScreen
        problem={getProblemById(selectedProblemId)}
        onBack={() => setStep('knowledge-list')}
      />
    )
  } else if (step === 'symptom') {
    screen = (
      <SymptomInputScreen
        onSubmit={handleSymptomSubmit}
        onBack={reset}
        submitting={submitting}
        offline={!online}
      />
    )
  } else if (step === 'followup') {
    screen = (
      <FollowUpScreen
        questions={followUpQuestions}
        onSubmit={handleFollowUpSubmit}
        onBack={reset}
        submitting={submitting}
      />
    )
  } else if (step === 'result') {
    screen = <ResultScreen result={result} onRestart={reset} />
  } else {
    // step === 'error'
    screen = (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-white">
        <div className="max-w-md mx-auto w-full text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-3">Something went wrong</h2>
          <p className="text-base text-gray-700 mb-8">
            We couldn't check your symptoms just now. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="w-full min-h-[56px] bg-green-700 text-white text-lg font-semibold rounded-xl px-6 py-4 active:bg-green-800"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ConnectivityBanner />
      {screen}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FarmerFlow />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
