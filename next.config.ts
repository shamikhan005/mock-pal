import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Silence Node.js module warnings from Vapi SDK in server context
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
