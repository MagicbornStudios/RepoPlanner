import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["repo-planner"],
  /** Resolve peer deps from the landing app when bundling the linked `repo-planner` package. */
  webpack: (config) => {
    const landingModules = path.resolve(process.cwd(), "node_modules");
    config.resolve.modules = [landingModules, ...(config.resolve.modules ?? [])];
    return config;
  },
};

export default nextConfig;
