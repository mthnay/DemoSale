import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg sunucu tarafında Node modülü olarak kalsın
  serverExternalPackages: ["pg"],
};

export default nextConfig;
