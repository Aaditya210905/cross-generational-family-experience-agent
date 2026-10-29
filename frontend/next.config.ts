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

  /* Proxy API calls to the FastAPI backend during development */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/health",
        destination: "http://localhost:8000/health",
      },
      {
        source: "/resolve",
        destination: "http://localhost:8000/resolve",
      },
      {
        source: "/retrieve",
        destination: "http://localhost:8000/retrieve",
      },
    ];
  },
};

export default nextConfig;
