import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    SESSION_SECRET:
      process.env.SESSION_SECRET ||
      'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=',
  },
};

export default nextConfig;
