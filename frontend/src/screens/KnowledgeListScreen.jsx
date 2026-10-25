// Knowledge Pages — list view. Read-only reference library, separate
// from the diagnosis flow. Reads straight from the knowledge base
// service (already cached offline since Phase 8) — no new caching
// logic, no API calls.
function KnowledgeListScreen({ problems, onSelect, onBack }) {
  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="text-green-800 text-base font-medium mb-4 min-h-[44px]"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-green-800 mb-1">Maize Problem Library</h2>
        <p className="text-base text-gray-600 mb-6">
          Browse all known maize problems, with or without describing symptoms.
        </p>

        <div className="flex flex-col gap-3">
          {problems.map((problem) => {
            const isCore = problem.mvp_status === 'core'
            return (
              <button
                key={problem.id}
                type="button"
                onClick={() => onSelect(problem.id)}
                className="text-left w-full border-2 border-gray-200 rounded-xl px-4 py-4 min-h-[56px] active:border-green-600"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-lg font-semibold text-gray-900">{problem.problem_name}</span>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isCore ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isCore ? 'Core' : 'Extra'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{problem.category}</p>
                <p className="text-base text-gray-700">{problem.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeListScreen
