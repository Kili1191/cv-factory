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
  // SECURITY HEADERS
  //
  // The site renders text people paste from anywhere and job ads copied
  // from any page. Nothing here restricts what the app itself does; these
  // stop the page from being framed by another site, stop browsers from
  // sniffing a response into a different type, and keep the referrer
  // short when the app links out. A Content-Security-Policy is not here
  // yet: pdf.js runs a worker from a blob, fonts come from Google, the
  // Supabase and Anthropic calls go to their own hosts, and a wrong CSP
  // kills features silently. It belongs in a report-only pass first.
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
      ],
    }];
  },
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
