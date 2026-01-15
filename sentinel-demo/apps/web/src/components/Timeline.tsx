import type { RunEvent, EventType } from '@shared/types'

interface TimelineProps {
  events: RunEvent[]
  onEventClick?: (event: RunEvent) => void
  selectedEventId?: string
}

// Map event types to step numbers and labels
const STEP_CONFIG: Record<EventType, { step: number; label: string; isDecisionPoint: boolean }> = {
  'Input Sanitized': { step: 1, label: 'Input Sanitized', isDecisionPoint: false },
  'Policy Evaluated': { step: 2, label: 'Policies Evaluated', isDecisionPoint: false },
  'Violation Detected': { step: 3, label: 'Violation Detected', isDecisionPoint: true },
  'Action Applied': { step: 4, label: 'Action Applied', isDecisionPoint: true },
  'Final Output Released': { step: 5, label: 'Output Released', isDecisionPoint: false },
}

// Icon components (inline SVG)
const GearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ChecklistIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

const WarningIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

// Get icon for event type
const getIcon = (eventType: EventType) => {
  switch (eventType) {
    case 'Input Sanitized':
      return <GearIcon />
    case 'Policy Evaluated':
      return <ChecklistIcon />
    case 'Violation Detected':
      return <WarningIcon />
    case 'Action Applied':
      return <ShieldIcon />
    case 'Final Output Released':
      return <CheckIcon />
    default:
      return null
  }
}

// Sort events by step number to ensure deterministic order
const sortEventsByStep = (events: RunEvent[]): RunEvent[] => {
  return [...events].sort((a, b) => {
    const configA = STEP_CONFIG[a.event_type as EventType]
    const configB = STEP_CONFIG[b.event_type as EventType]
    if (!configA || !configB) return a.seq - b.seq // Fallback to seq if unknown type
    return configA.step - configB.step
  })
}

export default function Timeline({ events, onEventClick, selectedEventId }: TimelineProps) {
  const sortedEvents = sortEventsByStep(events)
  const totalSteps = sortedEvents.length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Enforcement Sequence</h3>
      <p className="text-sm text-gray-500 mb-6">
        Each step is evaluated in order. Later actions cannot occur without earlier conditions being met.
      </p>
      
      <div className="relative">
        {/* Connector line - connects step circles */}
        {totalSteps > 1 && (
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />
        )}
        
        <div className="space-y-4 relative">
          {sortedEvents.map((event, idx) => {
            const config = STEP_CONFIG[event.event_type as EventType]
            if (!config) {
              // Fallback for unknown event types (e.g., Quarantined, Routing Recommended)
              return (
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
                    <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-semibold text-sm">
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
              )
            }

            const isDecisionPoint = config.isDecisionPoint
            const isSelected = selectedEventId === event.id

            return (
              <div
                key={event.id}
                className={`flex gap-4 p-4 rounded-lg cursor-pointer transition-colors relative ${
                  isSelected
                    ? 'bg-accent/10 border-2 border-accent'
                    : isDecisionPoint
                    ? 'bg-blue-50/50 hover:bg-blue-50 border-2 border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex-shrink-0 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    isDecisionPoint
                      ? 'bg-blue-600 text-white'
                      : 'bg-accent text-white'
                  }`}>
                    {config.step}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{getIcon(event.event_type)}</span>
                    <div className="font-semibold text-gray-900">
                      {config.step}. {config.label}
                    </div>
                    {isDecisionPoint && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        Decision point
                      </span>
                    )}
                  </div>
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
