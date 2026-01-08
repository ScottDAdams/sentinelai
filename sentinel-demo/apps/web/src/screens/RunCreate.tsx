import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { InputType } from '@shared/types'
import Layout from "../components/Layout";
import ContentShell from "../components/ContentShell";


export default function RunCreate() {
  const navigate = useNavigate()
  const [inputType, setInputType] = useState<InputType>('chat')
  const [inputContent, setInputContent] = useState('')
  const [scenarioId, setScenarioId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputContent.trim()) {
      setError('Please enter some content')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.createRun({
        input_type: inputType,
        input_content: inputContent,
        scenario_id: scenarioId || undefined,
      })
      navigate(`/runs/${response.run_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run')
      setLoading(false)
    }
  }

  return (
    <Layout>
      <ContentShell className="py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Run</h1>
          <p className="text-gray-600">Test Sentinel governance on your content</p>
        </div>
  
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Type
            </label>
            <div className="flex gap-4">
              {(["chat", "file", "code"] as InputType[]).map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="radio"
                    name="inputType"
                    value={type}
                    checked={inputType === type}
                    onChange={(e) => setInputType(e.target.value as InputType)}
                    className="mr-2"
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
  
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scenario (Optional - for demo)
            </label>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Auto-detect</option>
              <option value="pii_chat">PII Chat</option>
              <option value="file_comp">Compensation File</option>
              <option value="code_secret">Code Secret</option>
              <option value="injection">Injection</option>
            </select>
          </div>
  
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {inputType === "file" ? "File Content (paste text for now)" : "Content"}
            </label>
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder={
                inputType === "chat"
                  ? "Enter your chat message..."
                  : inputType === "file"
                  ? "Paste file content here..."
                  : "Enter code..."
              }
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              required
            />
          </div>
  
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
  
        <button type="submit" disabled={loading} className="button-primary">
        {loading ? "Processing..." : "Run"}
        </button>

        </form>
      </ContentShell>
    </Layout>
  );
  
}
