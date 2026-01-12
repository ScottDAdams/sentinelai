import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { InputType } from '@shared/types'
import { DEMO_SAMPLES } from '../lib/samples'
import Layout from "../components/Layout";
import ContentShell from "../components/ContentShell";


export default function RunCreate() {
  const navigate = useNavigate()
  const [inputType, setInputType] = useState<InputType>('chat')
  const [inputContent, setInputContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSampleId, setSelectedSampleId] = useState<string>('')

  const handleLoadSample = () => {
    if (!selectedSampleId) return

    const sample = DEMO_SAMPLES.find(s => s.id === selectedSampleId)
    if (sample) {
      setInputType(sample.input_type)
      setInputContent(sample.content)
      setSelectedSampleId('') // Reset dropdown after loading
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputContent.trim()) {
      setError('Please enter some content')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Scenarios are auto-detected by policy engine; manual overrides intentionally omitted.
      const response = await api.createRun({
        input_type: inputType,
        input_content: inputContent,
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
              {(["chat", "file", "code", "copilot"] as InputType[]).map((type) => (
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
              Load sample data
            </label>
            <div className="flex gap-2">
              <select
                value={selectedSampleId}
                onChange={(e) => setSelectedSampleId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select a sample...</option>
                {DEMO_SAMPLES.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={!selectedSampleId}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load
              </button>
            </div>
          </div>
  
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {inputType === "file" ? "File Content (paste text for now)" : inputType === "copilot" ? "Content (JSON required)" : "Content"}
            </label>
            {inputType === "copilot" && (
              <p className="text-sm text-gray-500 mb-2">
                Copilot input type requires valid JSON content.
              </p>
            )}
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder={
                inputType === "chat"
                  ? "Enter your chat message..."
                  : inputType === "file"
                  ? "Paste file content here..."
                  : inputType === "copilot"
                  ? 'Enter JSON content, e.g., {"message": "Hello", "context": {...}}'
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
