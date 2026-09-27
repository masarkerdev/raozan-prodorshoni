import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // এক্সেল লাইব্রেরি সার্ভারে সরাসরি চলবে, bundle করা হবে না
  serverExternalPackages: ["exceljs"],
  experimental: {
    // ছবি আপলোডের জন্য পরে লাগবে
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
