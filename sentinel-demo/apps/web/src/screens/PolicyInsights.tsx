import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import ContentShell from '../components/ContentShell'
import { api } from '../lib/api'

interface Insight {
  id: string
  severity: string
  title: string
  detail: string
  is_placeholder: boolean
}

interface InsightsResponse {
  status: string
  generated_at: string
  insights: Insight[]
}

export default function PolicyInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const result = await api.getInsights()
        setInsights(result.insights)
      } catch (err) {
        // Fallback to hardcoded insights if API fails
        setInsights([
          { 
            id: 'insight-1', 
            severity: 'info',
            title: 'Secrets Policy Scope Recommendation',
            detail: "Spike in Secrets Policy matches from .env snippets — consider tightening 'code' scope.",
            is_placeholder: true
          },
          { 
            id: 'insight-2', 
            severity: 'warning',
            title: 'Email Detection Gap',
            detail: "Repeated near-misses for customer emails in support tickets — add/enable email detection policy.",
            is_placeholder: true
          },
          { 
            id: 'insight-3', 
            severity: 'info',
            title: 'Project-Specific IP Policy Suggestion',
            detail: "Project Jaguar keyword appears in 6 runs this week — consider adding a bespoke IP policy.",
            is_placeholder: true
          },
          { 
            id: 'insight-4', 
            severity: 'warning',
            title: 'High Redaction Volume',
            detail: "High volume of REDACTED verdicts in chat inputs — review policy thresholds.",
            is_placeholder: true
          },
          { 
            id: 'insight-5', 
            severity: 'info',
            title: 'Workload-Specific Policy Recommendation',
            detail: "Copilot workload 'Microsoft Teams' shows elevated compliance flags — consider workload-specific policies.",
            is_placeholder: true
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [])

  return (
    <Layout>
      <ContentShell className="py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy Insights (Coming Soon)</h1>
          <p className="text-gray-600">
            Sentinel can recommend policy refinements based on observed AI usage patterns.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is a Phase 2 capability and is not active in the demo. The insights shown below are example placeholders only.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-12">Loading insights...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700">Example Insights (Placeholders)</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {insights.map((insight) => (
                <div key={insight.id} className="px-6 py-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900">{insight.title}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            insight.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {insight.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{insight.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            <strong>Disclaimer:</strong> Insights are advisory only; enforcement remains deterministic and policy-driven.
          </p>
        </div>
      </ContentShell>
    </Layout>
  )
}
