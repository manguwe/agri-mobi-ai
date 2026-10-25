// Knowledge Pages — detail view. Read-only, works identically
// online or offline since it only reads the knowledge base service.
function KnowledgeDetailScreen({ problem, onBack }) {
  if (!problem) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-white">
        <div className="max-w-md mx-auto w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Problem not found</h2>
          <p className="text-base text-gray-600 mb-8">
            We couldn't find that entry in the library.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full min-h-[56px] bg-green-700 text-white text-lg font-semibold rounded-xl px-6 py-4 active:bg-green-800"
          >
            Back to list
          </button>
        </div>
      </div>
    )
  }

  const isCore = problem.mvp_status === 'core'

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="text-green-800 text-base font-medium mb-4 min-h-[44px]"
        >
          ← Back to list
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">{problem.problem_name}</h2>
          <span
            className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isCore ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isCore ? 'Core' : 'Extra'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">{problem.category}</p>

        {problem.confidence_note && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 mb-6">
            <p className="text-amber-900 font-semibold text-base mb-1">Lower regional certainty</p>
            <p className="text-amber-800 text-base">{problem.confidence_note}</p>
          </div>
        )}

        {problem.description && (
          <p className="text-base text-gray-700 mb-6">{problem.description}</p>
        )}

        {problem.symptoms && problem.symptoms.length > 0 && (
          <Section title="Symptoms">
            <BulletList items={problem.symptoms} />
          </Section>
        )}

        {problem.verification_signs && problem.verification_signs.length > 0 && (
          <Section title="Signs to verify">
            <BulletList items={problem.verification_signs} />
          </Section>
        )}

        {problem.recommended_action && (
          <Section title="What to do">
            <p className="text-base text-gray-700">{problem.recommended_action}</p>
          </Section>
        )}

        {problem.prevention && problem.prevention.length > 0 && (
          <Section title="Prevention">
            <BulletList items={problem.prevention} />
          </Section>
        )}

        {problem.severity && (
          <Section title="Severity">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <p className="text-base text-gray-700">{problem.severity}</p>
            </div>
          </Section>
        )}

        {problem.when_to_contact_extension_worker && (
          <Section title="When to contact an extension officer">
            <p className="text-base text-gray-700">{problem.when_to_contact_extension_worker}</p>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function BulletList({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-base text-gray-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export default KnowledgeDetailScreen
