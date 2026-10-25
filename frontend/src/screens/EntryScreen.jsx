// Entry screen — the farmer's first view. Crop is fixed to "Maize"
// for the MVP (no crop picker yet, per scope fence).
function EntryScreen({ onStart, onBrowse, onAccount, onHistory }) {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-white">
      <div className="max-w-md mx-auto w-full text-center">
        <h1 className="text-3xl font-bold text-green-800 mb-3">AgriMobi AI</h1>
        <p className="text-lg text-gray-700 mb-1">Crop: <span className="font-semibold">Maize</span></p>
        <p className="text-base text-gray-600 mb-10">
          Describe what you're seeing on your maize plants and we'll help
          you figure out what might be wrong — and what to do next.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="w-full min-h-[56px] bg-green-700 text-white text-lg font-semibold rounded-xl px-6 py-4 active:bg-green-800"
        >
          Check my maize
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="w-full min-h-[48px] bg-white text-gray-700 text-base font-semibold rounded-xl px-6 py-3 mt-3 border border-gray-300 active:bg-gray-50"
        >
          Diagnosis history
        </button>
        <button
          type="button"
          onClick={onAccount}
          className="w-full min-h-[48px] bg-white text-green-800 text-base font-semibold rounded-xl px-6 py-3 mt-3 border border-green-700 active:bg-green-50"
        >
          Account / Cloud sync
        </button>
        <button
          type="button"
          onClick={onBrowse}
          className="w-full min-h-[56px] bg-white text-green-800 text-lg font-semibold rounded-xl px-6 py-4 mt-3 border-2 border-green-700 active:bg-green-50"
        >
          Browse problems
        </button>
      </div>
    </div>
  )
}

export default EntryScreen
