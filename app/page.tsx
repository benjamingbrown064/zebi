import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <img 
            src="/landing/zebi-logo.jpg" 
            alt="Zebi" 
            className="w-32 h-32 mx-auto mb-6"
          />
        </div>
        
        <h1 className="text-6xl md:text-7xl font-bold mb-6">
          Stop losing track of{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            what matters
          </span>
        </h1>
        
        <p className="text-2xl text-gray-600 mb-8 max-w-3xl mx-auto font-light">
          Zebi keeps you focused on the work that builds your business.
        </p>
        
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          AI-powered business operating system that turns revenue goals into executable plans—and tells you when you're off track.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link 
            href="/dashboard"
            className="px-8 py-4 bg-black text-white rounded-full text-lg font-medium hover:bg-gray-800 transition"
          >
            Launch App
          </Link>
          <Link 
            href="/signup"
            className="px-8 py-4 border-2 border-gray-300 text-gray-900 rounded-full text-lg font-medium hover:border-gray-400 transition"
          >
            Sign Up Free
          </Link>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto text-left">
          <div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Project Breakdown</h3>
            <p className="text-gray-600">Goals → Projects → Tasks in seconds</p>
          </div>
          
          <div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Revenue Tracking</h3>
            <p className="text-gray-600">See progress toward financial targets</p>
          </div>
          
          <div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Blocker Detection</h3>
            <p className="text-gray-600">AI flags risks before they derail you</p>
          </div>
        </div>
        
        <footer className="mt-20 pt-12 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            &copy; 2026 Zebi. Built for founders, by a founder.
          </p>
        </footer>
      </div>
    </div>
  )
}
