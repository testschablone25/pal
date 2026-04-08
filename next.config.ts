import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  allowedDevOrigins: ['transmitted-submitted-dem-live.trycloudflare.com', 'opinion-involve-sure-weddings.trycloudflare.com', 'placed-clark-livecam-closer.trycloudflare.com', 'tired-patient-tension-newest.trycloudflare.com', 'psi-deeply-concrete-dylan.trycloudflare.com', 'brokers-lid-accounting-filme.trycloudflare.com', 'housewives-leu-consensus-adware.trycloudflare.com'],
};

export default nextConfig;