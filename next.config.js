/** @type {import('next').NextConfig} */

// En-têtes de sécurité servis sur toutes les pages.
const securityHeaders = [
  // Interdit d'afficher le site dans un cadre d'un autre site : personne ne
  // peut piéger un admin en superposant la page /admin (clickjacking).
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Le site n'utilise pas next/image : on coupe l'optimiseur d'images, qui
  // est la source de la plupart des failles de Next.js.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
