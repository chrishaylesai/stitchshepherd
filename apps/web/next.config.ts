import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stitchharbor/api", "@stitchharbor/db", "@stitchharbor/types"]
};

export default nextConfig;
