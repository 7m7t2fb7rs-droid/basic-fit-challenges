"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tabs = [{ href: "/", label: "Classement", number: "01" }, { href: "/defis", label: "Les défis", number: "02" }];
export default function Nav() {
  const path = usePathname();
  const active = (href) => href === "/" ? path === "/" : path.startsWith(href);
  return <>
    <a href="#contenu" className="skip-link">Aller au contenu</a>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="Basic Fit Challenges — accueil"><span className="brand-mark" aria-hidden="true">b.</span><span className="brand-name">BASIC FIT<span>CHALLENGES CLUB</span></span></Link>
      <nav className="desktop-nav" aria-label="Navigation principale">{tabs.map(({ href, label, number }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "nav-link active" : "nav-link"}><small>{number}</small>{label}</Link>)}</nav>
      <Link href="/admin" className="admin-link" aria-current={active("/admin") ? "page" : undefined}>Espace équipe</Link>
    </div></header>
    <nav className="mobile-nav" aria-label="Navigation mobile">{tabs.map(({ href, label, number }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : ""}><span>{number}</span>{label}</Link>)}</nav>
  </>;
}
