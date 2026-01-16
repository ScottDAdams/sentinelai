import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import ContentShell from '../components/ContentShell'
import VerdictPill from '../components/VerdictPill'
import type { Verdict } from '@shared/types'

interface InvestigateRun {
  id: string
  created_at: string
  verdict: Verdict
  input_type: string
  input_preview: string | null
  policy_pack_version: string
  meta: Record<string, any>
}

type TabType = 'BLOCKED' | 'HELD_FOR_REVIEW'

export default function InvestigateList() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<InvestigateRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('BLOCKED')

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const result = await api.getInvestigateRuns()
        setRuns(result.runs as InvestigateRun[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load runs')
      } finally {
        setLoading(false)
      }
    }

    fetchRuns()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActorDisplay = (meta: Record<string, any>): string => {
    const actor = meta?.actor
    if (!actor) return 'Unknown'
    const display = actor.display || 'Unknown'
    const dept = actor.dept && actor.dept !== 'N/A' ? ` (${actor.dept})` : ''
    const role = actor.role && actor.role !== 'Employee' ? ` - ${actor.role}` : ''
    return `${display}${dept}${role}`
  }

  const getSourceDisplay = (meta: Record<string, any>, inputType: string): string => {
    const source = meta?.source
    if (!source) return inputType
    const surface = source.surface || inputType
    const platform = source.platform && source.platform !== 'Sentinel Demo UI' 
      ? ` (${source.platform})` 
      : ''
    return `${surface}${platform}`
  }

  const filteredRuns = runs.filter(run => run.verdict === activeTab)

  if (loading) {
    return (
      <Layout>
        <ContentShell className="py-10">
          <div className="text-center text-gray-600">Loading...</div>
        </ContentShell>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <ContentShell className="py-10">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        </ContentShell>
      </Layout>
    )
  }

  return (
    <Layout>
      <ContentShell className="py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exceptions</h1>
          <p className="text-gray-600">
            High-signal runs requiring investigation
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('BLOCKED')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'BLOCKED'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Blocked
              {runs.filter(r => r.verdict === 'BLOCKED').length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {runs.filter(r => r.verdict === 'BLOCKED').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('HELD_FOR_REVIEW')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'HELD_FOR_REVIEW'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Held for review
              {runs.filter(r => r.verdict === 'HELD_FOR_REVIEW').length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                  {runs.filter(r => r.verdict === 'HELD_FOR_REVIEW').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No {activeTab === 'BLOCKED' ? 'blocked' : 'held for review'} runs found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verdict
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy Pack
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRuns.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => navigate(`/investigate/${run.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getActorDisplay(run.meta)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getSourceDisplay(run.meta, run.input_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <VerdictPill verdict={run.verdict} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.policy_pack_version}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {run.input_preview || 'No preview'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentShell>
    </Layout>
  )
}
