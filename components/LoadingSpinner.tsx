export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-3 border-[#DD3A44] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
