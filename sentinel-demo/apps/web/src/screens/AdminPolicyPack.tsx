import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { GetPoliciesResponse } from '@shared/types'
import PolicyCard from '../components/PolicyCard'

export default function AdminPolicyPack() {
  const [data, setData] = useState<GetPoliciesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error || 'Failed to load policies'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy Pack</h1>
        <p className="text-gray-600">
          Version {data.policy_pack_version} • {data.policies.length} policies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} />
        ))}
      </div>
    </div>
  )
}
