import type { Policy } from '@shared/types'

interface PolicyCardProps {
  policy: Policy
}

export default function PolicyCard({ policy }: PolicyCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-1 rounded ${
              policy.status === 'ENABLED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {policy.status}
            </span>
            <span className="text-xs text-gray-500">v{policy.version}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Scope:</span>
          <span className="ml-2 text-gray-900">
            {policy.scope.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Action:</span>
          <span className="ml-2 text-gray-900 font-medium">{policy.action}</span>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Updated {new Date(policy.updated_at).toLocaleDateString()} by {policy.updated_by}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <button
          disabled
          className="px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg cursor-not-allowed"
        >
          Edit (Coming soon)
        </button>
      </div>
    </div>
  )
}
