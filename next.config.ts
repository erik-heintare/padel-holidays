import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Trip images come from operator sites we don't control, so they are rendered with plain <img>.
    unoptimized: true,
  },
};

export default nextConfig;
