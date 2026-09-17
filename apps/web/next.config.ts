import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@flowcraft/flow-engine", "@flowcraft/node-registry"],
};

export default config;
