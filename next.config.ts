import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackRoot: "/Users/simonbalazs/Desktop/git/zerelio/console",
  } as any,
  turbopack: {
    root: "/Users/simonbalazs/Desktop/git/zerelio/console",
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
