import "./globals.css";
import Nav from "./Nav";

export const metadata = {
  title: "Challenges Basic Fit",
  description: "Classement des défis — Accroche-toi, Dépasse-toi",
  applicationName: "Challenges Basic Fit",
  // iOS ignore le manifest : c'est ce bloc qui rend l'app plein écran depuis
  // l'écran d'accueil, et qui donne son nom sous l'icône.
  appleWebApp: {
    capable: true,
    title: "Challenges",
    statusBarStyle: "default",
  },
  // Évite que Safari transforme les scores en numéros de téléphone.
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // La page ne se prête pas au zoom horizontal, mais on laisse le zoom
  // jusqu'à 5x : le bloquer nuirait à qui en a besoin pour lire.
  maximumScale: 5,
  viewportFit: "cover", // permet à la barre basse d'utiliser la safe area
  themeColor: "#ff641f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Nav />
        <main id="contenu" className="site-main">{children}</main>
        <footer className="site-footer">
          <span className="footer-brand">BASIC FIT CHALLENGES</span>
          <span>Un club. Des défis. Ton meilleur niveau.</span>
          <span>À toi de jouer</span>
        </footer>
      </body>
    </html>
  );
}
