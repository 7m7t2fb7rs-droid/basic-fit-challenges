import "./globals.css";
import Nav from "./Nav";

export const metadata = {
  title: "Challenges Basic Fit",
  description: "Classement des défis — Accroche-toi, Dépasse-toi",
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
