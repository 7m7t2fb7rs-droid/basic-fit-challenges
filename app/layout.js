import "./globals.css";
import Link from "next/link";
import Nav from "./Nav";
import { DataProvider } from "@/lib/store";

export const metadata = {
  // Sert de base aux liens absolus des aperçus de partage (WhatsApp, etc.).
  metadataBase: new URL("https://basic-challenges.vercel.app"),
  title: "Challenges Basic Fit",
  description: "Le classement des défis du club, mis à jour à chaque score.",
  applicationName: "Challenges Basic Fit",
  // iOS ignore le manifest : c'est ce bloc qui rend l'app plein écran depuis
  // l'écran d'accueil, et qui donne son nom sous l'icône.
  appleWebApp: {
    capable: true,
    title: "Challenges",
    statusBarStyle: "default",
  },
  // Aperçu affiché quand on partage le lien.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Challenges Basic Fit",
    title: "Challenges Basic Fit",
    description: "Le classement des défis du club, mis à jour à chaque score.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Logo Basic Fit Challenges" }],
  },
  twitter: { card: "summary" },
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
  themeColor: "#f6f5f1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <DataProvider>
          <Nav />
          <main id="contenu" className="site-main">{children}</main>
          <footer className="site-footer">
            <span>Basic Fit Challenges</span>
            <Link href="/mentions-legales">Mentions légales et confidentialité</Link>
          </footer>
        </DataProvider>
      </body>
    </html>
  );
}
