import { useState } from 'react'
import type { Annotation } from '@shared/types'

interface WhyToggleProps {
  annotations: Annotation[]
}

export default function WhyToggle({ annotations }: WhyToggleProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (annotations.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-lg font-semibold text-gray-900">Why?</span>
        <span className="text-gray-500">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="mt-4 space-y-3">
          {annotations.map((ann, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">{ann.policy_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  ann.action === 'BLOCK' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {ann.action}
                </span>
              </div>
              <p className="text-sm text-gray-600 font-mono">{ann.span}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
