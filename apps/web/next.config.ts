import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
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
