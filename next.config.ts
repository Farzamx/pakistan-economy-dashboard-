import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Personal Inflation Calculator moved into the Decision Support Lab
  // (PEIC v4 Phase 1) — permanent redirect so any existing bookmark/share
  // link to its original standalone route still resolves.
  async redirects() {
    return [
      {
        source: "/tools/personal-inflation",
        destination: "/decision-support-lab/personal-inflation",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
