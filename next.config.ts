import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `cacheComponents` stays off so every page and route handler renders at
  // request time. This keeps the research dashboard (which reads live
  // provider data) simple to reason about.
  cacheComponents: false,

  // Prisma and the provider SDKs must stay outside the bundler so their
  // native/dynamic parts are not rewritten.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
  ],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
