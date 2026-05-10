import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // S3 — any bucket, any region
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      // Local dev API server (e.g. if serving uploads via Spring Boot)
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/oauth2/:path*",
        destination: `${apiUrl}/oauth2/:path*`,
      },
      {
        source: "/login/oauth2/:path*",
        destination: `${apiUrl}/login/oauth2/:path*`,
      },
    ];
  },
};

export default nextConfig;
