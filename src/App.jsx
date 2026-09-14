import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EntryScreen from './screens/EntryScreen.jsx'
import SymptomInputScreen from './screens/SymptomInputScreen.jsx'
import FollowUpScreen from './screens/FollowUpScreen.jsx'
import ResultScreen from './screens/ResultScreen.jsx'
import KnowledgeListScreen from './screens/KnowledgeListScreen.jsx'
import KnowledgeDetailScreen from './screens/KnowledgeDetailScreen.jsx'
import ConnectivityBanner from './components/ConnectivityBanner.jsx'
import { useConnectivity } from './hooks/useConnectivity.js'
import { submitSymptoms } from './services/api/client.js'
import { isReallyOnline } from './services/offline/connectivity.js'
import { getCachedProblems } from './services/offline/offlineCache.js'
import { matchOffline } from './services/offline/offlineMatch.js'
import { problem_categories, getProblemById } from './services/knowledgeBase.js'

// Builds a Result-screen-shaped object from an offline keyword match
// (or lack of one). Deliberately capped at "medium" confidence at
// best — a keyword-overlap match is not the real classifier and
// should never claim high certainty. Shape mirrors submitSymptoms()'s
// response so ResultScreen doesn't need to know which path produced it.
function buildOfflineResult(matchedProblem) {
  if (!matchedProblem) {
    return {
      status: 'insufficient_info',
      confidence: 'low',
      problem: null,
      signs_to_verify: [],
      guidance: '',
      requires_extension_support: true,
      extension_message:
        "We couldn't find a saved match for these symptoms offline. Please contact your local agricultural extension officer when possible.",
      offline: true,
    }
  }
  return {
    status: 'possible_problem',
    confidence: 'medium',
    problem: matchedProblem.problem_name,
    signs_to_verify: matchedProblem.verification_signs || [],
    guidance: matchedProblem.recommended_action || '',
    requires_extension_support: false,
    extension_message: matchedProblem.when_to_contact_extension_worker || '',
    offline: true,
  }
}

// The farmer flow (entry -> symptoms -> optional follow-up -> result)
// is a single linear wizard, not a set of independently-navigable
// pages, so it's driven by local state rather than separate routes.
// BrowserRouter/Routes is kept as the outer shell so future screens
// that DO need their own URL (Extension Support, Knowledge Library)
// can be added as routes later without restructuring this file.
function FarmerFlow() {
  const [step, setStep] = useState('entry') // 'entry' | 'symptom' | 'followup' | 'result' | 'error' | 'knowledge-list' | 'knowledge-detail'
  const [symptoms, setSymptoms] = useState('')
  const [followUpQuestions, setFollowUpQuestions] = useState([])
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProblemId, setSelectedProblemId] = useState(null)
  const online = useConnectivity()

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

  // Runs the offline path: cached knowledge base + keyword matching,
  // no API call at all.
  async function runOfflineMatch(symptomText) {
    const cachedProblems = await getCachedProblems()
    const matched = matchOffline(symptomText, cachedProblems)
    setResult(buildOfflineResult(matched))
    setStep('result')
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
        setResult(response)
        setStep('result')
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
        await runOfflineMatch(symptoms)
        return
      }

      const response = await submitSymptoms({ crop: 'maize', symptoms, answers })
      if (!response || typeof response !== 'object') {
        throw new Error('Unexpected response shape from submitSymptoms')
      }
      setResult(response)
      setStep('result')
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
    screen = <EntryScreen onStart={() => setStep('symptom')} onBrowse={() => setStep('knowledge-list')} />
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
