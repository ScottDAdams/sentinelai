import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { GetPoliciesResponse, Policy } from '@shared/types'
import Layout from '../components/Layout'
import ContentShell from '../components/ContentShell'
import PolicyDetailDrawer from '../components/PolicyDetailDrawer'

function getPolicyType(policy: Policy): 'STOCK' | 'BESPOKE' {
  // STOCK policies are system/default policies (updated_by === 'demo_admin')
  // BESPOKE policies are custom policies (updated_by !== 'demo_admin')
  return policy.updated_by === 'demo_admin' ? 'STOCK' : 'BESPOKE'
}

export default function AdminPolicyPack() {
  const [data, setData] = useState<GetPoliciesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const result = await api.getPolicies()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policies')
      } finally {
        setLoading(false)
      }
    }

    fetchPolicies()
  }, [])

  return (
    <Layout>
      <ContentShell className="py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Policies</h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : data ? `${data.policies.length} policies` : ''}
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-600 py-12">Loading policies...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.policies.map((policy) => {
                  const policyType = getPolicyType(policy)
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => setSelectedPolicy(policy)}
                      >
                        <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                        <div className="text-xs text-gray-500">v{policy.version}</div>
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => setSelectedPolicy(policy)}
                      >
                        <div className="flex flex-wrap gap-1">
                          {policy.scope.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => setSelectedPolicy(policy)}
                      >
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
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => setSelectedPolicy(policy)}
                      >
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            policyType === 'STOCK'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {policyType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPolicy(policy)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Policy Detail Drawer */}
        <PolicyDetailDrawer
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
        />
      </ContentShell>
    </Layout>
  )
}
