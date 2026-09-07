import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gift-chaos/shared"],
  distDir: process.env.VERCEL ? "../../.next" : ".next",
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default nextConfig;
