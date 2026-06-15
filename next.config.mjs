import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Pin the workspace root — a stray lockfile in a parent dir otherwise
  // makes Turbopack pick the wrong root.
  turbopack: {
    root: projectRoot
  }
};

export default nextConfig;
