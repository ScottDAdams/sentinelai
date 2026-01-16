import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { safeJsonParse } from '../lib/utils'
import type { GetRunResponse, Annotation } from '@shared/types'
import Layout from '../components/Layout'
import ContentShell from '../components/ContentShell'
import VerdictPill from '../components/VerdictPill'
import OutputBlock from '../components/OutputBlock'
import Timeline from '../components/Timeline'

export default function InvestigateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<GetRunResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [similarCount, setSimilarCount] = useState<{ count: number; by_user?: number } | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const result = await api.getRun(id)
        setData(result)

        // Fetch similar runs count for BLOCKED runs
        if (result.run.verdict === 'BLOCKED') {
          try {
            const similarResult = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/v1/investigate/runs/${id}/similar`)
            if (similarResult.ok) {
              const similar = await similarResult.json()
              setSimilarCount(similar)
            }
          } catch (err) {
            // Silently fail - pattern is optional
            console.warn('Failed to fetch similar runs count:', err)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <Layout>
        <ContentShell className="py-10">
          <div className="text-center text-gray-600">Loading...</div>
        </ContentShell>
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout>
        <ContentShell className="py-10">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error || 'Run not found'}
          </div>
        </ContentShell>
      </Layout>
    )
  }

  const run = data.run
  const verdict = run.verdict

  // Parse meta safely
  const meta = safeJsonParse(run.meta, {} as Record<string, any>)
  
  // Get annotations from meta (fallback to data.annotations if meta doesn't have them)
  const annotations: Annotation[] = meta.annotations || data.annotations || []

  // Parse event payloads safely
  const events = data.events.map(event => ({
    ...event,
    payload: safeJsonParse(event.payload, {} as Record<string, any>)
  }))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Layout>
      <ContentShell className="py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/investigate')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to Exceptions
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Investigation</h1>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Verdict</div>
              <div className="mt-1">
                <VerdictPill verdict={verdict} />
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Actor</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {meta?.actor?.display || 'Unknown'}
                {meta?.actor?.id && (
                  <span className="ml-2 text-xs text-gray-500 font-mono">
                    ({meta.actor.id})
                  </span>
                )}
              </div>
              {(meta?.actor?.dept || meta?.actor?.role) && (
                <div className="mt-1 text-xs text-gray-600">
                  {meta.actor.role}
                  {meta.actor.dept && meta.actor.dept !== 'N/A' && ` • ${meta.actor.dept}`}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">Source</div>
              <div className="mt-1 text-sm font-medium text-gray-900 capitalize">
                {meta?.source?.surface || run.input_type}
                {meta?.source?.platform && meta.source.platform !== 'Sentinel Demo UI' && (
                  <span className="ml-2 text-xs text-gray-600">
                    ({meta.source.platform})
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created At</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(run.created_at)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Input Type</div>
              <div className="mt-1 text-sm font-medium text-gray-900 capitalize">
                {run.input_type}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Policy Pack</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {run.policy_pack_version}
              </div>
            </div>
          </div>
        </div>

        {/* Baseline vs Governed Output */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Output Comparison</h2>
          <OutputBlock
            title="Governed Output"
            content={run.governed_output}
            annotations={annotations}
          />
          {run.baseline_output && (
            <OutputBlock
              title="Baseline Output — Ungoverned"
              content={run.baseline_output}
            />
          )}
        </div>

        {/* Why / Evidence */}
        {annotations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Why / Evidence</h2>
            <div className="space-y-4">
              {(() => {
                // Group annotations by policy
                const policyGroups: Record<string, Annotation[]> = {}
                annotations.forEach(ann => {
                  if (!policyGroups[ann.policy_name]) {
                    policyGroups[ann.policy_name] = []
                  }
                  policyGroups[ann.policy_name].push(ann)
                })

                return Object.entries(policyGroups).map(([policyName, anns]) => (
                  <div key={policyName} className="border-l-2 border-gray-300 pl-4">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {policyName}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Action: {anns[0].action} • {anns.length} match{anns.length !== 1 ? 'es' : ''} found
                    </div>
                    <div className="text-xs text-gray-700 space-y-1">
                      <div className="font-medium">Matched spans:</div>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        {anns.map((ann, idx) => (
                          <li key={idx} className="font-mono">
                            "{ann.span}" (position {ann.start}-{ann.end})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* Event Timeline */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Timeline</h2>
          <Timeline events={events} verdict={verdict} />
        </div>

        {/* Pattern - Recent Similar Activity */}
        {verdict === 'BLOCKED' && similarCount !== null && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Similar Activity</h2>
            <div className="text-sm text-gray-700">
              <div className="font-medium">
                {similarCount.count} BLOCKED run{similarCount.count !== 1 ? 's' : ''} in last 30 days
              </div>
              {similarCount.by_user !== undefined && similarCount.by_user > 0 && (
                <div className="mt-1 text-gray-600">
                  {similarCount.by_user} by this user
                </div>
              )}
            </div>
          </div>
        )}
      </ContentShell>
    </Layout>
  )
}
