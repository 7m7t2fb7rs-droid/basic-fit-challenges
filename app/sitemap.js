// Servi sur /sitemap.xml : les pages publiques du site.
const SITE = "https://basic-challenges.vercel.app";

export default function sitemap() {
  return [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/defis`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
