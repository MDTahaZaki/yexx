import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits `.next/standalone` (a minimal server + only the node_modules
  // actually needed at runtime) so the Docker runner stage doesn't have to
  // ship the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
