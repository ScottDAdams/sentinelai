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
}

export default function InvestigateList() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<InvestigateRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Investigate</h1>
          <p className="text-gray-600">
            High-signal runs requiring investigation (BLOCKED and HELD FOR REVIEW)
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No high-signal runs found.</p>
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
                    Verdict
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Input Type
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
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => navigate(`/investigate/${run.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <VerdictPill verdict={run.verdict} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {run.input_type}
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
