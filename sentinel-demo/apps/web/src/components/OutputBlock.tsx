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

  // Render content with annotations as React elements
  const renderHighlightedContent = () => {
    if (annotations.length === 0) {
      return content
    }

    // Sort annotations by start position
    const sorted = [...annotations].sort((a, b) => a.start - b.start)
    const parts: Array<{ text: string; highlight?: string }> = []
    let lastIndex = 0

    for (const ann of sorted) {
      // Add text before this annotation
      if (ann.start > lastIndex) {
        parts.push({ text: content.slice(lastIndex, ann.start) })
      }
      // Add highlighted text
      parts.push({
        text: content.slice(ann.start, ann.end),
        highlight: ann.action === 'BLOCK' ? 'bg-red-200' : 'bg-yellow-200',
      })
      lastIndex = ann.end
    }

    // Add remaining text after last annotation
    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex) })
    }

    return (
      <>
        {parts.map((part, idx) =>
          part.highlight ? (
            <mark key={idx} className={`${part.highlight} px-1 rounded`}>
              {part.text}
            </mark>
          ) : (
            <span key={idx}>{part.text}</span>
          )
        )}
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
