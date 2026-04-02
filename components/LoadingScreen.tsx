interface LoadingScreenProps {
  message?: string
  fullPage?: boolean
}

export default function LoadingScreen({
  message = 'Loading...',
  fullPage = true,
}: LoadingScreenProps) {
  const containerClasses = fullPage
    ? 'fixed inset-0 flex items-center justify-center bg-[#F9F9F9] z-50'
    : 'flex items-center justify-center min-h-[400px]'

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        {/* Monolith spinner — black, no colour */}
        <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
        <p className="text-[12px] font-medium text-[#A3A3A3] tracking-[0.05em] uppercase">{message}</p>
      </div>
    </div>
  )
}
