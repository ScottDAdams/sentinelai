import { useState } from 'react'

interface OutputBlockProps {
  title: string
  content: string | null
  annotations?: Array<{ start: number; end: number; policy_name: string; action: string }>
}

export default function OutputBlock({ title, content, annotations = [] }: OutputBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!content) return null

  // Render content with redaction token highlighting
  // Only highlights the literal "[REDACTED]" token, not annotation ranges
  const renderHighlightedContent = () => {
    if (!content) return null

    // Split content by "[REDACTED]" token and wrap each token in a styled span
    const parts = content.split(/(\[REDACTED\])/g)
    
    return (
      <>
        {parts.map((part, idx) => {
          if (part === '[REDACTED]') {
            return (
              <span key={idx} className="redaction-token">
                {part}
              </span>
            )
          }
          return <span key={idx}>{part}</span>
        })}
      </>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap break-words">
        {renderHighlightedContent()}
      </div>
    </div>
  )
}
