// Servi sur /robots.txt. L'espace admin n'a rien à faire dans les moteurs.
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: "https://basic-challenges.vercel.app/sitemap.xml",
  };
}
