import { useEffect, useState } from 'react'
import type { Policy } from '@shared/types'

interface PolicyDetailDrawerProps {
  policy: Policy | null
  onClose: () => void
}

function getPolicyType(policy: Policy): 'STOCK' | 'BESPOKE' {
  return policy.updated_by === 'demo_admin' ? 'STOCK' : 'BESPOKE'
}

// Parse conditions safely - handle both jsonb object and stringified JSON
function parseConditions(conditions: any): Record<string, any> {
  if (!conditions) return {}
  
  // If it's already an object, return it
  if (typeof conditions === 'object' && !Array.isArray(conditions)) {
    return conditions
  }
  
  // If it's a string, try to parse it
  if (typeof conditions === 'string') {
    try {
      return JSON.parse(conditions)
    } catch (e) {
      console.warn('Failed to parse conditions as JSON:', e)
      return {}
    }
  }
  
  return {}
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Could add a toast notification here
  }).catch(err => {
    console.error('Failed to copy:', err)
  })
}

function renderPolicyLogic(conditions: Record<string, any>) {
  const parsed = parseConditions(conditions)
  
  const hasKeywords = Array.isArray(parsed.keywords) && parsed.keywords.length > 0
  const hasPhrases = Array.isArray(parsed.phrases) && parsed.phrases.length > 0
  const hasPatterns = Array.isArray(parsed.patterns) && parsed.patterns.length > 0
  const hasLabels = Array.isArray(parsed.labels) && parsed.labels.length > 0
  const hasWorkloads = Array.isArray(parsed.workloads) && parsed.workloads.length > 0
  const requiresAggregation = parsed.requires_aggregation === true

  // If we have structured fields, render them nicely
  if (hasKeywords || hasPhrases || hasPatterns || hasLabels || hasWorkloads || requiresAggregation) {
    return (
      <div className="space-y-4">
        {hasKeywords && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Keywords</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {parsed.keywords.map((keyword: string, idx: number) => (
                <li key={idx} className="font-mono">{keyword}</li>
              ))}
            </ul>
          </div>
        )}
        {hasPhrases && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Phrases</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {parsed.phrases.map((phrase: string, idx: number) => (
                <li key={idx}>{phrase}</li>
              ))}
            </ul>
          </div>
        )}
        {hasPatterns && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Patterns (Regex)</div>
            <ul className="space-y-2">
              {parsed.patterns.map((pattern: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <code className="flex-1 bg-gray-50 px-3 py-2 rounded text-xs font-mono text-gray-800 break-all">
                    {pattern}
                  </code>
                  <button
                    onClick={() => copyToClipboard(pattern)}
                    className="flex-shrink-0 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Copy pattern"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasLabels && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Labels</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {parsed.labels.map((label: string, idx: number) => (
                <li key={idx}>{label}</li>
              ))}
            </ul>
          </div>
        )}
        {hasWorkloads && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Workloads</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
              {parsed.workloads.map((workload: string, idx: number) => (
                <li key={idx}>{workload}</li>
              ))}
            </ul>
          </div>
        )}
        {requiresAggregation && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Aggregation Detection</div>
            <p className="text-sm text-gray-600">
              Flags files that appear to contain aggregated compensation/HR data
            </p>
          </div>
        )}
      </div>
    )
  }

  // Otherwise, render as pretty-printed JSON
  return (
    <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  )
}

// Hardcoded "Why it exists" explanations for STOCK policies (UI-only help text)
const STOCK_POLICY_EXPLANATIONS: Record<string, string> = {
  'sensitive-data': 'Detects and protects personally identifiable information (PII) including Social Security Numbers, email addresses, and phone numbers to comply with privacy regulations.',
  'secrets-detection': 'Identifies exposed API keys, tokens, passwords, and other sensitive credentials in code and configuration files to prevent security breaches.',
  'prompt-injection': 'Blocks attempts to manipulate AI systems through prompt injection attacks that could override safety instructions or extract sensitive information.',
  'confidential-data': 'Protects confidential business information such as compensation data, HR records, and other sensitive organizational data from unauthorized disclosure.',
  'confidential-file': 'Flags files containing confidential information based on content analysis and metadata to ensure proper handling and access controls.',
  'sensitivity-label-guard': 'Requires manual review for Copilot interactions involving confidential sensitivity labels or compliance flags indicating financial or executive-level discussions to ensure appropriate governance.',
}

function getPolicyExplanation(policyId: string, policyType: 'STOCK' | 'BESPOKE'): string | null {
  if (policyType === 'STOCK' && STOCK_POLICY_EXPLANATIONS[policyId]) {
    return STOCK_POLICY_EXPLANATIONS[policyId]
  }
  return null
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

            {/* Why it exists (STOCK policies only) */}
            {getPolicyExplanation(policy.id, policyType) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Why it exists</div>
                <p className="text-sm text-gray-600">{getPolicyExplanation(policy.id, policyType)}</p>
                <p className="text-xs text-gray-500 mt-2 italic">
                  (UI-only help text, not enforcement logic)
                </p>
              </div>
            )}

            {/* Policy Logic */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">Policy Logic</div>
              {renderPolicyLogic(policy.conditions || {})}
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
