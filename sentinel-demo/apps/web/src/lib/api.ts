import type {
    CreateRunRequest,
    CreateRunResponse,
    GetRunResponse,
    ExportResponse,
    GetPoliciesResponse,
  } from '@shared/types'
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  
  async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }
  
    return response.json()
  }
  
  export const api = {
    createRun: (data: CreateRunRequest): Promise<CreateRunResponse> =>
      fetchAPI('/v1/runs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  
    getRun: (runId: string): Promise<GetRunResponse> =>
      fetchAPI(`/v1/runs/${runId}`),
  
    exportRun: (runId: string): Promise<ExportResponse> =>
      fetchAPI(`/v1/runs/${runId}/export`),
  
    getPolicies: (): Promise<GetPoliciesResponse> =>
      fetchAPI('/v1/policies'),
    
    getInsights: (): Promise<{ status: string; generated_at: string; insights: Array<{ id: string; severity: string; title: string; detail: string; is_placeholder: boolean }> }> =>
      fetchAPI('/v1/insights'),
    
    getInvestigateRuns: (): Promise<{ runs: Array<{ id: string; created_at: string; verdict: string; input_type: string; input_preview: string | null; policy_pack_version: string; meta: Record<string, any> }> }> =>
      fetchAPI('/v1/investigate/runs'),
    
    getExceptionsCount: (): Promise<{ count: number }> =>
      fetchAPI('/v1/investigate/count'),
  }
  