import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/* Pin the workspace root.
 *
 * There is a stray 93-byte package-lock.json in the user's home directory with
 * no package.json beside it. Turbopack walks upward looking for a lockfile to
 * decide the workspace root, finds that one, and picks ~ as the root — so it
 * watches the entire home directory and resolves modules from the wrong place.
 *
 * Pinning it here fixes it inside the repo, rather than deleting a file that
 * lives outside it. */
const nextConfig: NextConfig = {
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
