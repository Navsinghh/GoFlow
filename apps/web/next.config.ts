import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: [
    "@flowcraft/flow-engine",
    "@flowcraft/node-registry",
    // Yjs-based libraries are bundled so they import Yjs the same way our code
    // does (as an ES module) ...
    "y-indexeddb",
    "y-protocols",
    "@hocuspocus/provider",
  ],
  // ... and Yjs itself loads once from node_modules on the server, so every
  // route shares one copy. Two copies break Yjs's constructor checks.
  serverExternalPackages: ["yjs"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
