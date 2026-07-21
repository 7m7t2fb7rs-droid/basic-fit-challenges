"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const IconClassement = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconDefis = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);


const TABS = [
  { href: "/", label: "Classement", Icon: IconClassement },
  { href: "/defis", label: "Défis", Icon: IconDefis },
];

export default function Nav() {
  const path = usePathname();
  const isActive = (href) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <>
      {/* ── Header (toutes tailles) ── */}
      <header className="bg-bf-orange shadow">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3">
          {/* Logo */}
          <Link href="/" className="shrink-0 font-extrabold text-white tracking-tight">
            🏋️ <span className="hidden sm:inline">Challenges </span>Basic Fit
          </Link>

          {/* Admin — mobile, discret en haut à droite */}
          <Link
            href="/admin"
            className={`ml-auto sm:hidden text-xs font-medium transition ${
              isActive("/admin") ? "text-white" : "text-white/60 hover:text-white/80"
            }`}
          >
            Admin
          </Link>

          {/* Liens centrés — desktop uniquement */}
          <div className="hidden sm:flex flex-1 justify-center gap-3">
            {[{ href: "/", label: "Classement" }, { href: "/defis", label: "Défis" }].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-5 py-2 text-base font-extrabold tracking-wide transition ${
                  isActive(href) ? "bg-white text-bf-dark shadow" : "text-white hover:bg-white/20"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Admin — desktop uniquement */}
          <Link
            href="/admin"
            className={`hidden sm:block shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isActive("/admin") ? "bg-white text-bf-dark shadow" : "text-white/70 hover:text-white hover:bg-white/20"
            }`}
          >
            Admin
          </Link>
        </div>
      </header>

      {/* ── Bottom tab bar — mobile uniquement ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-white border-t border-neutral-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-bf-orange" : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                <Icon />
                {label}
                {active && <span className="absolute bottom-0 h-0.5 w-10 rounded-t-full bg-bf-orange" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
