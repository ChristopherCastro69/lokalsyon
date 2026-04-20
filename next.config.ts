import type { NextConfig } from "next";
import path from "node:path";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  devIndicators: false,
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "1",
});

export default analyzer(nextConfig);
