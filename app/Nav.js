"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useData } from "@/lib/store";
import { gymStatus, statusLabel } from "@/lib/gym";
const tabs = [{ href: "/", label: "Classement", number: "01" }, { href: "/defis", label: "Les défis", number: "02" }];
/* L'état de la salle, sous le nom du club. Il se recalcule tout seul :
   à 22h30 un mardi, l'affichage bascule sans que personne n'intervienne. */
function GymStatus() {
  const { data } = useData();
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Tant que l'heure du client n'est pas connue, on n'affiche rien : mieux
  // vaut un vide bref qu'un « Fermé » erroné le temps d'une seconde.
  if (!data || !now) return null;

  const status = gymStatus(data.gymHours, data.gymOverride, now);
  return (
    <span className={status.open ? "gym-status open" : "gym-status"}>
      <span className="gym-dot" aria-hidden="true" />
      {statusLabel(status, now)}
    </span>
  );
}

export default function Nav() {
  const path = usePathname();
  const active = (href) => href === "/" ? path === "/" : path.startsWith(href);
  return <>
    <a href="#contenu" className="skip-link">Aller au contenu</a>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="Basic Fit Challenges — accueil"><img className="brand-mark" src="/logo-mark.png" alt="" width="120" height="96" /><span className="brand-name">BASIC FIT<span>CHALLENGES CLUB</span><GymStatus /></span></Link>
      <nav className="desktop-nav" aria-label="Navigation principale">{tabs.map(({ href, label, number }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "nav-link active" : "nav-link"}><small>{number}</small>{label}</Link>)}</nav>
      <Link href="/admin" className="admin-link" aria-current={active("/admin") ? "page" : undefined}>Espace équipe</Link>
    </div></header>
    <nav className="mobile-nav" aria-label="Navigation mobile">{tabs.map(({ href, label, number }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : ""}><span>{number}</span>{label}</Link>)}</nav>
  </>;
}
