import { useConnectivity } from '../hooks/useConnectivity.js'

// Small, persistent, always-visible connectivity indicator. Uses
// color AND text (never color alone) so it stays accessible.
function ConnectivityBanner() {
  const online = useConnectivity()

  return (
    <div
      role="status"
      className={`w-full text-center text-sm font-semibold py-1.5 ${
        online ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'
      }`}
    >
      {online ? 'Online' : 'Offline — using saved guidance'}
    </div>
  )
}

export default ConnectivityBanner
