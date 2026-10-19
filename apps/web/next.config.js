/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ricozbooks/shared'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.API_URL || 'http://localhost:5000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

