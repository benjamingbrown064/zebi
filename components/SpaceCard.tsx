'use client'

import Link from 'next/link'
import { FaBuilding, FaFolderOpen, FaTasks, FaFileAlt, FaLightbulb } from 'react-icons/fa'

interface SpaceCardProps {
  id: string
  name: string
  industry?: string | null
  stage?: string | null
  revenue?: number | null
  projectCount?: number
  taskCount?: number
  documentCount?: number
  insightCount?: number
  logoUrl?: string | null
  websiteUrl?: string | null
}

export default function SpaceCard({
  id,
  name,
  industry,
  stage,
  revenue,
  projectCount = 0,
  taskCount = 0,
  documentCount = 0,
  insightCount = 0,
  logoUrl,
  websiteUrl,
}: SpaceCardProps) {
  return (
    <Link href={`/spaces/${id}`}>
      <div className="card-base p-6 card-hover group">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Logo or Icon */}
          <div className="w-12 h-12 bg-[#F5F5F5] rounded-[10px] flex items-center justify-center flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="w-full h-full object-cover rounded-[10px]"
              />
            ) : (
              <FaBuilding className="text-[#737373] text-xl" />
            )}
          </div>

          {/* Space Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1c1b1b] truncate group-hover:text-accent-600 transition">
              {name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#A3A3A3]">
              {industry && <span>{industry}</span>}
              {industry && stage && <span>•</span>}
              {stage && <span className="capitalize">{stage}</span>}
            </div>
          </div>

          {/* Revenue Badge */}
          {revenue !== null && revenue !== undefined && revenue > 0 && (
            <div className="text-right">
              <div className="text-sm font-semibold text-[#1c1b1b]">
                £{(revenue / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-[#A3A3A3]">MRR</div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-[#5a5757]">
            <FaFolderOpen className="text-[#C4C0C0]" />
            <span>
              {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[#5a5757]">
            <FaTasks className="text-[#C4C0C0]" />
            <span>
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[#5a5757]">
            <FaFileAlt className="text-[#C4C0C0]" />
            <span>
              {documentCount} {documentCount === 1 ? 'doc' : 'docs'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[#5a5757]">
            <FaLightbulb className="text-[#C4C0C0]" />
            <span>
              {insightCount} {insightCount === 1 ? 'insight' : 'insights'}
            </span>
          </div>
        </div>

        {/* Website Link */}
        {websiteUrl && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-600 hover:text-accent-700 transition truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {websiteUrl.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>
    </Link>
  )
}
