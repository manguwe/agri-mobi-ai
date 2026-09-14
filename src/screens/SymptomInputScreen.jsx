import { useState } from 'react'

// Symptom input screen. Blocks submission when the text area is
// empty and shows an inline (not just console) validation message.
//
// `offline` is passed down from the connectivity check that already
// runs in App.jsx (which owns the actual submitSymptoms() call and
// online/offline branching) — this screen just reflects that state so
// the farmer knows what to expect before they submit.
function SymptomInputScreen({ onSubmit, onBack, submitting, offline }) {
  const [text, setText] = useState('')
  const [validationError, setValidationError] = useState('')

  function handleSubmit() {
    if (text.trim() === '') {
      setValidationError('Please describe what you see on your maize plant before continuing.')
      return
    }
    setValidationError('')
    onSubmit(text.trim())
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-white">
      <div className="max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="text-green-800 text-base font-medium mb-4 min-h-[44px]"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-green-800 mb-2">What are you seeing?</h2>
        <p className="text-base text-gray-600 mb-4">
          Describe the problem in your own words — for example, where on
          the plant it is and what it looks like.
        </p>

        {offline && (
          <p className="text-sm text-orange-700 bg-orange-50 border border-orange-300 rounded-lg px-3 py-2 mb-4">
            You're offline right now, so we'll check this against guidance
            already saved on your phone.
          </p>
        )}

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (validationError) setValidationError('')
          }}
          rows={6}
          placeholder="e.g. The leaves have holes and I can see small worms inside the whorl."
          className="w-full text-lg border-2 border-gray-300 rounded-xl p-4 mb-2 focus:outline-none focus:border-green-600"
        />

        {validationError && (
          <p className="text-red-600 text-base mb-4" role="alert">
            {validationError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full min-h-[56px] bg-green-700 text-white text-lg font-semibold rounded-xl px-6 py-4 mt-2 active:bg-green-800 disabled:opacity-60"
        >
          {submitting ? 'Checking…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}

export default SymptomInputScreen
