// Manifest de l'application web — servi sur /manifest.webmanifest.
// C'est lui qui déclenche la proposition « Installer » sur Android/Chrome.
export default function manifest() {
  return {
    name: "Challenges Basic Fit",
    // Ce qui s'affiche sous l'icône : court, sinon le système le tronque.
    short_name: "Challenges",
    description: "Le classement des défis du club, mis à jour à chaque score.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    // Plein écran, sans barre d'adresse.
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5f1", // l'écran de démarrage
    theme_color: "#f6f5f1", // la barre de statut
    categories: ["sports", "fitness"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android redécoupe l'icône (cercle, carré arrondi…) : le logo a 20 % de
      // marge, il reste donc entier quelle que soit la forme appliquée.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Classement", url: "/" },
      { name: "Défis", url: "/defis" },
    ],
  };
}
