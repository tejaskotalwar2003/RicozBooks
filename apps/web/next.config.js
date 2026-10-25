/** @type {import('next').NextConfig} */
const rawApiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ricozbooks/shared'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${rawApiUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
