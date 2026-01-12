import { useEffect } from 'react'
import type { Policy } from '@shared/types'

interface PolicyDetailDrawerProps {
  policy: Policy | null
  onClose: () => void
}

function getPolicyType(policy: Policy): 'STOCK' | 'BESPOKE' {
  return policy.updated_by === 'demo_admin' ? 'STOCK' : 'BESPOKE'
}

function renderConditions(conditions: Record<string, any>) {
  const hasKeywords = Array.isArray(conditions.keywords) && conditions.keywords.length > 0
  const hasPhrases = Array.isArray(conditions.phrases) && conditions.phrases.length > 0
  const hasPatterns = Array.isArray(conditions.patterns) && conditions.patterns.length > 0
  const hasLabels = Array.isArray(conditions.labels) && conditions.labels.length > 0
  const hasWorkloads = Array.isArray(conditions.workloads) && conditions.workloads.length > 0

  // If we have structured fields, render them nicely
  if (hasKeywords || hasPhrases || hasPatterns || hasLabels || hasWorkloads) {
    return (
      <div className="space-y-4">
        {hasKeywords && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Keywords</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {conditions.keywords.map((keyword: string, idx: number) => (
                <li key={idx} className="font-mono">{keyword}</li>
              ))}
            </ul>
          </div>
        )}
        {hasPhrases && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Phrases</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {conditions.phrases.map((phrase: string, idx: number) => (
                <li key={idx}>{phrase}</li>
              ))}
            </ul>
          </div>
        )}
        {hasPatterns && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Patterns (Regex)</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {conditions.patterns.map((pattern: string, idx: number) => (
                <li key={idx} className="font-mono text-xs break-all">{pattern}</li>
              ))}
            </ul>
          </div>
        )}
        {hasLabels && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Labels</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {conditions.labels.map((label: string, idx: number) => (
                <li key={idx}>{label}</li>
              ))}
            </ul>
          </div>
        )}
        {hasWorkloads && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Workloads</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {conditions.workloads.map((workload: string, idx: number) => (
                <li key={idx}>{workload}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // Otherwise, render as pretty-printed JSON
  return (
    <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto">
      {JSON.stringify(conditions, null, 2)}
    </pre>
  )
}

export default function PolicyDetailDrawer({ policy, onClose }: PolicyDetailDrawerProps) {
  // Handle ESC key to close drawer
  useEffect(() => {
    if (!policy) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [policy, onClose])

  if (!policy) return null

  const policyType = getPolicyType(policy)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Policy Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Name and ID */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{policy.name}</h3>
              <div className="text-sm text-gray-500 font-mono">{policy.id}</div>
            </div>

            {/* Status and Type */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  policy.status === 'ENABLED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {policy.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  policyType === 'STOCK'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {policyType}
              </span>
              <span className="text-sm text-gray-500">v{policy.version}</span>
            </div>

            {/* Scope */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Scope</div>
              <div className="flex flex-wrap gap-2">
                {policy.scope.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Action</div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  policy.action === 'REDACT'
                    ? 'bg-yellow-100 text-yellow-800'
                    : policy.action === 'BLOCK'
                    ? 'bg-red-100 text-red-800'
                    : policy.action === 'REVIEW'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {policy.action}
              </span>
            </div>

            {/* Updated info */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Last Updated</div>
              <div className="text-sm text-gray-900">
                {new Date(policy.updated_at).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">by {policy.updated_by}</div>
            </div>

            {/* Conditions */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">Conditions</div>
              {renderConditions(policy.conditions || {})}
            </div>

            {/* Audit note */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                Policies are versioned; evaluation uses the policy snapshot stored with each run export.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
