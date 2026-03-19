import { FaSpinner } from 'react-icons/fa'

interface LoadingScreenProps {
  message?: string
  fullPage?: boolean
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  fullPage = true 
}: LoadingScreenProps) {
  const containerClasses = fullPage
    ? 'fixed inset-0 flex items-center justify-center bg-white z-50'
    : 'flex items-center justify-center min-h-[400px]'

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center justify-center gap-4">
        <FaSpinner className="animate-spin text-[#DD3A44] text-4xl" />
        <p className="text-[#5a5757] text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}
