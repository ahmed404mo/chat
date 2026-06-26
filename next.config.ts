import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

// Enable static export for Capacitor mobile builds
if (process.env.NEXT_EXPORT === "true") {
  nextConfig.output = "export";
  nextConfig.images = { unoptimized: true };
}

export default nextConfig;
