/** @type {import('next').NextConfig} */
let backendUrl = process.env.API_URL;
if (!backendUrl && process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http') && !process.env.NEXT_PUBLIC_API_URL.includes(':8000')) {
  backendUrl = process.env.NEXT_PUBLIC_API_URL;
}
const backendTarget = (backendUrl || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ricozbooks/shared'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendTarget}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
