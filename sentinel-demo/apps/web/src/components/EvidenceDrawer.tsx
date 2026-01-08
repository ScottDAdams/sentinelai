import type { RunEvent } from '@shared/types'

interface EvidenceDrawerProps {
  event: RunEvent | null
  onClose: () => void
}

export default function EvidenceDrawer({ event, onClose }: EvidenceDrawerProps) {
  if (!event) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{event.event_type}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Sequence</div>
              <div className="text-gray-900">{event.seq}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Timestamp</div>
              <div className="text-gray-900">{new Date(event.ts).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Payload</div>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
