import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenNext Cloudflare — configuração do adapter
  // Ref: https://opennext.js.org/cloudflare
  experimental: {
    // Server Actions habilitado por padrão no Next.js 14+
  },
};

export default nextConfig;
