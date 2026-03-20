'use client'

import { useState } from 'react'
import { FaLink, FaCheckCircle, FaBullseye } from 'react-icons/fa'

interface TaskOutcomeFieldsProps {
  expectedOutcome?: string | null
  completionNote?: string | null
  outputUrl?: string | null
  isCompleted: boolean
  onUpdate: (fields: {
    expectedOutcome?: string | null
    completionNote?: string | null
    outputUrl?: string | null
  }) => void
}

export default function TaskOutcomeFields({
  expectedOutcome,
  completionNote,
  outputUrl,
  isCompleted,
  onUpdate,
}: TaskOutcomeFieldsProps) {
  const [showExpected, setShowExpected] = useState(!!expectedOutcome)
  const [showResult, setShowResult] = useState(!!completionNote)
  const [showOutput, setShowOutput] = useState(!!outputUrl)
  const [expectedVal, setExpectedVal] = useState(expectedOutcome || '')
  const [resultVal, setResultVal] = useState(completionNote || '')
  const [outputVal, setOutputVal] = useState(outputUrl || '')

  const hasAnyData = !!expectedOutcome || !!completionNote || !!outputUrl
  const showAddButtons = !showExpected || !showResult || !showOutput

  return (
    <div className="mt-4 pt-4 border-t border-[#F5F5F5]">
      {/* Existing outcome data — always show if present */}
      {showExpected && (
        <div className="mb-3">
          <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
            <FaBullseye className="text-[#DD3A44]" />
            Expected outcome
          </label>
          <textarea
            value={expectedVal}
            onChange={e => setExpectedVal(e.target.value)}
            onBlur={() => onUpdate({ expectedOutcome: expectedVal || null })}
            placeholder="What should this task produce?"
            rows={2}
            className="w-full text-[13px] text-[#1A1A1A] bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] px-3 py-2 resize-none focus:outline-none focus:border-[#DD3A44] transition-colors"
          />
        </div>
      )}

      {(showResult || isCompleted) && (
        <div className="mb-3">
          <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
            <FaCheckCircle className="text-[#10B981]" />
            Result
          </label>
          <textarea
            value={resultVal}
            onChange={e => setResultVal(e.target.value)}
            onBlur={() => onUpdate({ completionNote: resultVal || null })}
            placeholder="What actually happened?"
            rows={2}
            className="w-full text-[13px] text-[#1A1A1A] bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] px-3 py-2 resize-none focus:outline-none focus:border-[#10B981] transition-colors"
          />
        </div>
      )}

      {showOutput && (
        <div className="mb-3">
          <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
            <FaLink className="text-[#6366F1]" />
            Output link
          </label>
          <input
            type="url"
            value={outputVal}
            onChange={e => setOutputVal(e.target.value)}
            onBlur={() => onUpdate({ outputUrl: outputVal || null })}
            placeholder="https://..."
            className="w-full text-[13px] text-[#1A1A1A] bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] px-3 py-2 focus:outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>
      )}

      {/* Add buttons — only show if not all fields are open */}
      {showAddButtons && (
        <div className="flex flex-wrap gap-2 mt-2">
          {!showExpected && (
            <button
              onClick={() => setShowExpected(true)}
              className="text-[11px] text-[#A3A3A3] hover:text-[#DD3A44] flex items-center gap-1 transition-colors"
            >
              <FaBullseye className="text-xs" />
              + Expected outcome
            </button>
          )}
          {!showResult && !isCompleted && (
            <button
              onClick={() => setShowResult(true)}
              className="text-[11px] text-[#A3A3A3] hover:text-[#10B981] flex items-center gap-1 transition-colors"
            >
              <FaCheckCircle className="text-xs" />
              + Result note
            </button>
          )}
          {!showOutput && (
            <button
              onClick={() => setShowOutput(true)}
              className="text-[11px] text-[#A3A3A3] hover:text-[#6366F1] flex items-center gap-1 transition-colors"
            >
              <FaLink className="text-xs" />
              + Output link
            </button>
          )}
        </div>
      )}
    </div>
  )
}
