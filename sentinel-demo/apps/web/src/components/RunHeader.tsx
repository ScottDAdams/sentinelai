import type { Run } from '@shared/types'
import VerdictPill from './VerdictPill'

interface RunHeaderProps {
  run: Run
  onShare?: () => void
}

export default function RunHeader({ run, onShare }: RunHeaderProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-gray-500 font-mono">Run {run.id.slice(0, 8)}</span>
            <VerdictPill verdict={run.verdict} />
          </div>
          <p className="text-sm text-gray-600">
            {new Date(run.created_at).toLocaleString()}
          </p>
        </div>
        {onShare && (
          <button
            onClick={onShare}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Share
          </button>
        )}
      </div>
    </div>
  )
}
