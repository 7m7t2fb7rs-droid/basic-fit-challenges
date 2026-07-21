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
        <main className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:pb-8">{children}</main>
        <footer className="hidden sm:block py-10 text-center text-xs text-neutral-400">
          Challenges Basic Fit · Accroche-toi, Dépasse-toi
        </footer>
      </body>
    </html>
  );
}
