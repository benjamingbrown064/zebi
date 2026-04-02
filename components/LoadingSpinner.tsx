export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
    </div>
  )
}
