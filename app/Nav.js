"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const isActive = (href) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const link = (href, label) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        isActive(href)
          ? "bg-white text-bf-dark shadow-sm"
          : "text-white/90 hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-bf-orange shadow">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-auto text-lg font-extrabold tracking-tight text-white">
          🏋️ Challenges Basic Fit
        </Link>
        {link("/", "Classement")}
        {link("/defis", "Défis")}
        {link("/admin", "Admin")}
      </div>
    </header>
  );
}
