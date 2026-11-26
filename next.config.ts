import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bun:sqlite is a Bun built-in; never try to bundle it.
  serverExternalPackages: ["bun:sqlite"],
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
