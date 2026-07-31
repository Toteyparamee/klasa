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

  // Cross-Origin-Opener-Policy default ของ Next.js/Vercel คือ same-origin
  // ซึ่งบล็อก popup ของ Google Identity Services SDK (GAFE login) —
  // ต้องผ่อนเป็น same-origin-allow-popups ดู GAFE_LOGIN_DESIGN.md §6.6
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
