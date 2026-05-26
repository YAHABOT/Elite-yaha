import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence workspace root warning by specifying the correct root
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
