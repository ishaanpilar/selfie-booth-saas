import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@selfie-booth/core", "@selfie-booth/ui"],
};

export default nextConfig;
