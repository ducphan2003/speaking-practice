import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Cho phép popup Google Sign-In giao tiếp postMessage với trang (tránh COOP chặn OAuth)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
