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
  // Chromium and its driver are native packages: bundling them breaks the
  // binary lookup. Next leaves them in node_modules and requires them at
  // run time, which is what @sparticuz/chromium expects.
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    // The Chromium that prints the PDF ships as brotli files in the
    // package's bin/ folder, read at run time with a computed path. File
    // tracing follows imports, not computed paths: without this line the
    // function can deploy without its browser, answer 500, and the export
    // silently falls back to the picture. Named explicitly so the bundle
    // cannot lose it.
    outputFileTracingIncludes: { "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"] },
  },
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
