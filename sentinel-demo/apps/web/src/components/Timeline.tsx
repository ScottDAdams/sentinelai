import { useState } from 'react'
import type { RunEvent } from '@shared/types'

interface TimelineProps {
  events: RunEvent[]
  onEventClick?: (event: RunEvent) => void
  selectedEventId?: string
}

export default function Timeline({ events, onEventClick, selectedEventId }: TimelineProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Enforcement Sequence</h3>
      <div className="space-y-4">
        {events.map((event, idx) => (
          <div
            key={event.id}
            className={`flex gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
              selectedEventId === event.id
                ? 'bg-accent/10 border-2 border-accent'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
            onClick={() => onEventClick?.(event)}
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-sm">
                {event.seq}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{event.event_type}</div>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(event.ts).toLocaleTimeString()}
              </div>
              {Object.keys(event.payload).length > 0 && (
                <div className="text-xs text-gray-500 mt-2 font-mono">
                  {JSON.stringify(event.payload, null, 2).slice(0, 100)}...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
