import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw/sw.ts",
  swDest: "public/sw.js",
  // Cache shell otomatis dari output Next.js
  reloadOnOnline: true,
  // Disable di dev agar tidak ganggu development
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atrioom/ui-tokens"],
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

export default withSerwist(nextConfig);
