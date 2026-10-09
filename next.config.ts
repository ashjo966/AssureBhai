import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
  allowedDevOrigins: ["*.loca.lt", "localhost:3000", "192.168.1.16:3000"],
};

export default nextConfig;
