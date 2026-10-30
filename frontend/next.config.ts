import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Turbopack + Tailwind CSS */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /* Proxy API calls to the FastAPI backend during development and production */
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/resolve",
        destination: `${backendUrl}/resolve`,
      },
      {
        source: "/retrieve",
        destination: `${backendUrl}/retrieve`,
      },
    ];
  },
};

export default nextConfig;
