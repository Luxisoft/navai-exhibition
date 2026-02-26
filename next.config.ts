import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    optimizeCss: true,
  },
  async redirects() {
    return [
      {
        source: "/documentacion/readme-raiz",
        destination: "/documentation/home",
        permanent: true,
      },
      {
        source: "/documentation/readme-raiz",
        destination: "/documentation/home",
        permanent: true,
      },
      {
        source: "/documentacion/:path*",
        destination: "/documentation/:path*",
        permanent: true,
      },
      {
        source: "/pedir-implementacion",
        destination: "/request-implementation",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
