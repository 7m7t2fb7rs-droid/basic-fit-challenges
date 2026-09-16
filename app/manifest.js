// Manifest de l'application web — servi sur /manifest.webmanifest.
// C'est lui qui déclenche la proposition « Installer » sur Android/Chrome.
export default function manifest() {
  return {
    name: "Challenges Basic Fit",
    // Ce qui s'affiche sous l'icône : court, sinon le système le tronque.
    short_name: "Challenges",
    description: "Classement des défis de la salle — Accroche-toi, Dépasse-toi",
    lang: "fr",
    start_url: "/",
    scope: "/",
    // Plein écran, sans barre d'adresse.
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f3ed", // l'écran de démarrage
    theme_color: "#ff641f", // la barre de statut
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
      { name: "Les défis", url: "/defis" },
    ],
  };
}
