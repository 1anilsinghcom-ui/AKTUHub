/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
  },
  // Tree-shake heavy icon/chart libs — only bundle what's imported
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-dropdown-menu",
    ],
  },
  // Compress responses
  compress: true,
  // Inline small assets instead of extra requests
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Enable HTTP/2 push hints for static assets
  poweredByHeader: false,
}

export default nextConfig
