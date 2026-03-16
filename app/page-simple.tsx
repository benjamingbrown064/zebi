export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Coming soon / redirect to landing */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">Zebi</h1>
          <p className="text-xl text-gray-600 mb-8">AI-Powered Business Operating System</p>
          <a 
            href="/dashboard" 
            className="inline-block px-8 py-4 bg-black text-white rounded-full text-lg font-medium hover:bg-gray-800 transition"
          >
            Launch App
          </a>
        </div>
      </div>
    </div>
  )
}
