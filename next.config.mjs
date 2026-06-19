/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.klasaapp.com',
      },
    ],
  },
};

export default nextConfig;
