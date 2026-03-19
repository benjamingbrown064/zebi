/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable compression for all responses
  compress: true,
  
  // Optimise bundle output
  poweredByHeader: false,
  
  eslint: {
    ignoreDuringBuilds: false,
  },

  // HTTP caching headers for static assets and API responses
  async headers() {
    return [
      {
        // Immutable cache for Next.js static chunks (_next/static)
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Short cache on read API routes (backup to Next.js revalidate)
        source: '/api/(tasks|projects|companies|goals|statuses|objectives)/:path*',
        headers: [{ key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=120' }],
      },
    ]
  },
};

module.exports = nextConfig;
