/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

let nextConfig = {
  reactStrictMode: true,
};

// Only wrap with PWA in production to avoid build issues
if (isProd) {
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
  });
  nextConfig = withPWA(nextConfig);
}

module.exports = nextConfig;
