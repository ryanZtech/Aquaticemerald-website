/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
