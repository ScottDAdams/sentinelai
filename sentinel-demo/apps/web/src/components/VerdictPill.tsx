import type { Verdict } from '@shared/types'

interface VerdictPillProps {
  verdict: Verdict
}

export default function VerdictPill({ verdict }: VerdictPillProps) {
  const styles = {
    ALLOWED: 'bg-green-100 text-green-800',
    REDACTED: 'bg-yellow-100 text-yellow-800',
    BLOCKED: 'bg-red-100 text-red-800',
    HELD_FOR_REVIEW: 'bg-purple-100 text-purple-800',
  }

  const displayText = verdict === 'HELD_FOR_REVIEW' ? 'Held for review' : verdict === 'ALLOWED' ? 'Allowed' : verdict === 'REDACTED' ? 'Redacted' : verdict === 'BLOCKED' ? 'Blocked' : verdict

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[verdict]}`}
    >
      {displayText}
    </span>
  )
}
