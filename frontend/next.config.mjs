/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js 16 experimental flags can land here as we adopt them
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/:path*',
      },
    ];
  },
};

export default nextConfig;
