import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project explicitly. Without this, Next.js
  // walks up the filesystem looking for lockfiles and can pick the wrong
  // directory as the root if another lockfile exists further up the tree
  // (e.g. a stray package-lock.json in a parent folder like ~/Downloads),
  // which triggers the "inferred workspace root" warning.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Apply to every route, including the admin panel.
        source: "/:path*",
        headers: [
          // Prevent the admin login/dashboard from being framed by another
          // site (clickjacking protection).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop browsers from MIME-sniffing responses into an unintended
          // content type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full referring URL (which may contain order refs
          // or emails in query strings) to third-party destinations.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features this site doesn't use.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
