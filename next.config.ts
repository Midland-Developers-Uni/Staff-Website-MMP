import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Base config options */
  reactStrictMode: true,
  
  /* Experimental features */
  experimental: {
    // Configure serverActions as an object (not a boolean)
    serverActions: {
      // You can adjust these values as needed
      bodySizeLimit: '2mb',
      allowedOrigins: ['*']
    }
  },
  
  // Tell Next.js to handle mysql2 as a server-only package (updated property name)
  serverExternalPackages: ["mysql2"],
  
  // Additional settings to help with API routes and database connections
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        dns: false,
        net: false,
        tls: false,
      };
    }
    return config;
  }
};

export default nextConfig;