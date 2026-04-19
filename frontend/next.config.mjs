import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
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
