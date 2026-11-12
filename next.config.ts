import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@shivansh/mini-app-ui"],
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
