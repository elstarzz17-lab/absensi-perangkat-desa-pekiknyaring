import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ikutkan template database (dipakai bootstrap-db.ts saat deploy ke hosting baru)
  outputFileTracingIncludes: {
    "/**": ["./prisma/template.db"],
  },
};

export default nextConfig;
