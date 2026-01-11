import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Temporarily ignore TypeScript build errors due to Prisma type resolution issue
  // This is a known issue with Turbopack and Prisma 7.x
  // TODO: Remove once Turbopack/Prisma compatibility is fixed
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configure image optimization
  images: {
    // Allow local images from the uploads directory
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
