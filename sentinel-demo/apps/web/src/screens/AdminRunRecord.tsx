import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { ExportResponse, RunEvent } from '@shared/types'
import RunHeader from '../components/RunHeader'
import OutputBlock from '../components/OutputBlock'
import Timeline from '../components/Timeline'
import EvidenceDrawer from '../components/EvidenceDrawer'
import ExportButtons from '../components/ExportButtons'

export default function AdminRunRecord() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ExportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<RunEvent | null>(null)
  const [replayIndex, setReplayIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchRun = async () => {
      try {
        const result = await api.exportRun(id)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run')
      } finally {
        setLoading(false)
      }
    }

    fetchRun()
  }, [id])

  const handleReplay = () => {
    if (!data) return
    setReplayIndex(0)
    let currentIndex = 0
    const interval = setInterval(() => {
      currentIndex++
      if (currentIndex >= data.events.length) {
        clearInterval(interval)
        setReplayIndex(null)
      } else {
        setReplayIndex(currentIndex)
      }
    }, 1000)
  }

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
          {error || 'Run not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <RunHeader run={data.run} />

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Input</h2>
          <OutputBlock title="Input Content" content={data.run.input_content} />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Baseline Output — Ungoverned</h2>
          <OutputBlock title="Baseline Output" content={data.run.baseline_output} />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Governed Output</h2>
          <OutputBlock title="Governed Output" content={data.run.governed_output} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Enforcement Audit Sequence</h2>
            <button
              onClick={handleReplay}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors font-medium"
            >
              Replay
            </button>
          </div>
          <Timeline
            events={data.events}
            onEventClick={setSelectedEvent}
            selectedEventId={replayIndex !== null ? data.events[replayIndex]?.id : undefined}
          />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Evidence & Export</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <ExportButtons exportData={data} />

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">SIEM Payload Preview</h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto">
                {JSON.stringify(data.siem_payload_preview, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      </div>

      <EvidenceDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}
