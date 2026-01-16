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
type SortField = 'created_at' | 'actor' | 'source' | 'verdict' | 'policy_pack_version' | 'preview'
type SortDirection = 'asc' | 'desc'

export default function InvestigateList() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<InvestigateRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('BLOCKED')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedRuns = [...runs]
    .filter(run => run.verdict === activeTab)
    .sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'actor':
          aValue = getActorDisplay(a.meta).toLowerCase()
          bValue = getActorDisplay(b.meta).toLowerCase()
          break
        case 'source':
          aValue = getSourceDisplay(a.meta, a.input_type).toLowerCase()
          bValue = getSourceDisplay(b.meta, b.input_type).toLowerCase()
          break
        case 'verdict':
          aValue = a.verdict
          bValue = b.verdict
          break
        case 'policy_pack_version':
          aValue = a.policy_pack_version
          bValue = b.policy_pack_version
          break
        case 'preview':
          aValue = (a.input_preview || '').toLowerCase()
          bValue = (b.input_preview || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="ml-1 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      )
    }
    return (
      <span className="ml-1 text-gray-600">
        {sortDirection === 'asc' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    )
  }

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

        {sortedRuns.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No {activeTab === 'BLOCKED' ? 'blocked' : 'held for review'} runs found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Time
                        <SortIcon field="created_at" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('actor')}
                    >
                      <div className="flex items-center">
                        Actor
                        <SortIcon field="actor" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('source')}
                    >
                      <div className="flex items-center">
                        Source
                        <SortIcon field="source" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('verdict')}
                    >
                      <div className="flex items-center">
                        Verdict
                        <SortIcon field="verdict" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('policy_pack_version')}
                    >
                      <div className="flex items-center">
                        Policy Pack
                        <SortIcon field="policy_pack_version" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('preview')}
                    >
                      <div className="flex items-center">
                        Preview
                        <SortIcon field="preview" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRuns.map((run) => (
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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="max-w-md overflow-x-auto">
                          <span className="whitespace-nowrap">{run.input_preview || 'No preview'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ContentShell>
    </Layout>
  )
}
