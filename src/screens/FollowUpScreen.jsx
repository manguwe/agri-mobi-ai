import { useState } from 'react'

// Follow-up question screen. Shown when the mock response says more
// info is needed. Simple single-choice questions with large tappable
// options (basic-Android-phone friendly). Requires every question to
// be answered before continuing.
function FollowUpScreen({ questions, onSubmit, onBack, submitting }) {
  const [answers, setAnswers] = useState({})
  const [validationError, setValidationError] = useState('')

  function selectOption(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
    if (validationError) setValidationError('')
  }

  function handleSubmit() {
    const allAnswered = questions.every((q) => answers[q.id])
    if (!allAnswered) {
      setValidationError('Please answer each question before continuing.')
      return
    }
    onSubmit(answers)
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

        <h2 className="text-2xl font-bold text-green-800 mb-2">A couple more questions</h2>
        <p className="text-base text-gray-600 mb-6">
          This helps us narrow down what might be wrong.
        </p>

        {questions.map((q) => (
          <div key={q.id} className="mb-6">
            <p className="text-lg font-medium text-gray-800 mb-3">{q.question}</p>
            <div className="flex flex-col gap-3">
              {q.options.map((option) => {
                const selected = answers[q.id] === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectOption(q.id, option)}
                    className={`w-full min-h-[56px] text-left text-lg rounded-xl px-5 py-3 border-2 ${
                      selected
                        ? 'bg-green-700 border-green-700 text-white font-semibold'
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

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
          {submitting ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

export default FollowUpScreen
