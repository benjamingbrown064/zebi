'use client'

import { useState, useEffect } from 'react'
import { FaLink, FaUnlink, FaSpinner } from 'react-icons/fa'
import { linkCompaniesToGoal, getLinkedCompanies } from '@/app/actions/goals'

interface Company {
  id: string
  name: string
  revenue: number | null
}

interface GoalCompanyLinkerProps {
  goalId: string
  workspaceId: string
  isFinancial: boolean
  onUpdate?: () => void
}

export default function GoalCompanyLinker({
  goalId,
  workspaceId,
  isFinancial,
  onUpdate,
}: GoalCompanyLinkerProps) {
  const [linkedCompanies, setLinkedCompanies] = useState<Company[]>([])
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return
    loadData()
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load all companies
      const companiesRes = await fetch(`/api/companies?workspaceId=${workspaceId}`)
      if (companiesRes.ok) {
        const companies = await companiesRes.json()
        setAllCompanies(companies)
      }

      // Load linked companies
      const companies = await getLinkedCompanies(workspaceId, goalId)
      setLinkedCompanies(companies)
      setSelectedCompanies(companies.map(c => c.id))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await linkCompaniesToGoal(workspaceId, goalId, selectedCompanies)
      setIsOpen(false)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to link companies:', err)
      alert('Failed to link companies')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isFinancial) {
    return null
  }

  const totalRevenue = selectedCompanies.reduce((sum, companyId) => {
    const company = allCompanies.find(c => c.id === companyId)
    return sum + (company?.revenue || 0)
  }, 0)

  return (
    <div className="mt-6 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1A1A1A]">Link Companies</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[13px] px-3 py-1.5 bg-[#DD3A44] text-white rounded-[10px] hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <FaLink className="text-xs" />
          {linkedCompanies.length > 0 ? 'Manage' : 'Add'} Companies
        </button>
      </div>

      {/* Display linked companies */}
      {linkedCompanies.length > 0 && (
        <div className="bg-[#f6f3f2] rounded-[14px] p-4 mb-4">
          <p className="text-[12px] text-[#525252] mb-3">
            {linkedCompanies.length} compan{linkedCompanies.length === 1 ? 'y' : 'ies'} linked
          </p>
          <div className="space-y-2">
            {linkedCompanies.map(company => (
              <div
                key={company.id}
                className="flex items-center justify-between bg-white p-3 rounded-[10px] "
              >
                <span className="text-[14px] font-medium text-[#1A1A1A]">{company.name}</span>
                <span className="text-[13px] text-[#DD3A44] font-semibold">
                  £{(company.revenue || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4">
            <p className="text-[13px] text-[#525252]">Total Revenue:</p>
            <p className="text-2xl font-bold text-[#DD3A44]">
              £{totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-md mx-4 p-6">
            <h4 className="font-semibold text-[#1A1A1A] mb-4">Link Companies to Goal</h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <FaSpinner className="animate-spin text-[#DD3A44] text-2xl" />
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
                  {allCompanies.length === 0 ? (
                    <p className="text-[13px] text-[#A3A3A3] py-4">No companies available</p>
                  ) : (
                    allCompanies.map(company => (
                      <label
                        key={company.id}
                        className="flex items-center gap-3 p-3 rounded-[10px]  cursor-pointer hover:bg-[#f6f3f2] transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => handleToggleCompany(company.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#1A1A1A]">{company.name}</p>
                          <p className="text-[12px] text-[#525252]">
                            £{(company.revenue || 0).toLocaleString()}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {/* Preview total */}
                {selectedCompanies.length > 0 && (
                  <div className="bg-[#f6f3f2] p-4 rounded-[10px] mb-6">
                    <p className="text-[12px] text-[#525252] mb-2">Total Revenue Preview:</p>
                    <p className="text-xl font-bold text-[#DD3A44]">
                      £{totalRevenue.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2  rounded-[10px] text-[13px] font-medium text-[#525252] hover:bg-[#f6f3f2] transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-[#DD3A44] text-white rounded-[10px] text-[13px] font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <FaSpinner className="animate-spin inline mr-2" />
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
