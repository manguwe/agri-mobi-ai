// Result screen. Confidence is shown as a plain-language label plus
// color — never as a raw number/percentage, so it doesn't read as
// false real-world certainty to the farmer.
const CONFIDENCE_STYLES = {
  high: {
    label: 'Likely',
    badgeClass: 'bg-green-100 text-green-800 border-2 border-green-600',
  },
  medium: {
    label: 'Possible',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-600',
  },
  low: {
    label: 'Uncertain — see an expert',
    badgeClass: 'bg-red-100 text-red-800 border-2 border-red-600',
  },
}

function ResultScreen({ result, onRestart }) {
  const style = CONFIDENCE_STYLES[result.confidence] || CONFIDENCE_STYLES.low
  const isLowConfidence = result.confidence === 'low' || result.requires_extension_support

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-white">
      <div className="max-w-md mx-auto w-full">
        {result.offline && (
          <p className="text-sm font-semibold text-orange-800 bg-orange-50 border border-orange-300 rounded-lg px-3 py-2 mb-4 inline-block">
            Offline mode — using saved guidance
          </p>
        )}

        {isLowConfidence && (
          <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-semibold text-lg mb-1">Talk to an extension officer</p>
            <p className="text-red-700 text-base">{result.extension_message}</p>
          </div>
        )}

        <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full mb-3 ${style.badgeClass}`}>
          {style.label}
        </span>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {result.problem || "We couldn't confidently name a likely problem"}
        </h2>

        {result.signs_to_verify && result.signs_to_verify.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Signs to check</h3>
            <ul className="list-disc list-inside space-y-1 text-base text-gray-700">
              {result.signs_to_verify.map((sign, i) => (
                <li key={i}>{sign}</li>
              ))}
            </ul>
          </div>
        )}

        {result.guidance && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">What to do now</h3>
            <p className="text-base text-gray-700">{result.guidance}</p>
          </div>
        )}

        {!isLowConfidence && result.extension_message && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">When to seek expert help</h3>
            <p className="text-base text-gray-700">{result.extension_message}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onRestart}
          className="w-full min-h-[56px] bg-green-700 text-white text-lg font-semibold rounded-xl px-6 py-4 mt-2 active:bg-green-800"
        >
          Start over
        </button>
      </div>
    </div>
  )
}

export default ResultScreen
