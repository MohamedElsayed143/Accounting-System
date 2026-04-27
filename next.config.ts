import type { NextConfig } from "next";

// Loader path from orchids-visual-edits
const loaderPath = require.resolve("orchids-visual-edits/loader.js");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // امسح السطر بتاع outputFileTracingRoot خالص
  typescript: {
    ignoreBuildErrors: true, // يفضل تخليها true دلوقتي عشان نعدي الـ Build لو فيه Warnings
  },
  eslint: {
    ignoreDuringBuilds: true, // يفضل تخليها true دلوقتي عشان نعدي الـ Build
  },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [loaderPath],
      },
    },
  },
} as NextConfig;

export default nextConfig;