/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.nba.com"
      }
    ]
  }
};

export default nextConfig;
