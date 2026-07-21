"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const isActive = (href) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const mainLink = (href, label) => (
    <Link
      href={href}
      className={`rounded-xl px-5 py-2 text-base font-extrabold tracking-wide transition ${
        isActive(href)
          ? "bg-white text-bf-dark shadow"
          : "text-white hover:bg-white/20"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-bf-orange shadow">
      <div className="mx-auto flex max-w-4xl items-center px-4 py-3">
        <Link href="/" className="text-sm font-bold text-white/80 hover:text-white transition shrink-0">
          🏋️ Basic Fit
        </Link>
        <div className="flex flex-1 justify-center gap-3">
          {mainLink("/", "Classement")}
          {mainLink("/defis", "Défis")}
        </div>
        <Link
          href="/admin"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            isActive("/admin")
              ? "bg-white text-bf-dark shadow"
              : "text-white/70 hover:text-white hover:bg-white/20"
          }`}
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
