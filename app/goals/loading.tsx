export default function GoalsLoading() {
  return (
    <div className="min-h-screen bg-[#F9F9F9] pl-64">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded border border-[#E5E5E5] p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-12 bg-gray-200 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded mb-4" />
              <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
