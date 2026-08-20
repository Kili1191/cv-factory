// Identifiant de build, expose au client.
//
// Sans lui, impossible de dire si thenuvi.com sert la derniere version ou une
// version en cache : on regarde l'interface et on devine. Vercel fournit le
// SHA du commit deploye ; en local on retombe sur l'horodatage du build.
const BUILD_ID =
  (process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7))
  || process.env.GIT_SHA
  || ("dev-" + new Date().toISOString().slice(0, 16).replace("T", " "));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    } else {
      config.externals = [...(config.externals || []), 'canvas', 'pdfjs-dist'];
    }
    return config;
  },
};

module.exports = nextConfig;
