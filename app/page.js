"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  buildLeaderboard,
  rankChallenge,
  METRIC_LABEL,
  GENDER_LABEL,
  displayName,
  indexParticipants,
  attachParticipants,
  filterEntriesByGender,
} from "@/lib/scoring";
import { fetchCountdownEnd, endOfDay, DEFAULT_COUNTDOWN_END } from "@/lib/settings";

function useCountdown(target) {
  const calc = () => {
    const diff = target - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: false,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.getTime()]);
  return time;
}

function Countdown({ endDate }) {
  const { days, hours, minutes, seconds, done } = useCountdown(endDate);
  return <div className="countdown-panel">
    <span className="eyebrow">{done ? "Saison terminée" : "Le chrono tourne"}</span>
    {done ? <p className="countdown-done">Bravo à tous les participants.</p> :
      <div className="countdown">{[[days,"jours"],[hours,"heures"],[minutes,"min"],[seconds,"sec"]].map(([v,label]) =>
        <div key={label}><strong>{String(v).padStart(2,"0")}</strong><span>{label}</span></div>)}</div>}
    <span className="countdown-date">Fin du classement · {endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
  </div>;
}

function GenderFilter({ value, onChange }) {
  return <div className="filter-tabs" aria-label="Catégorie du classement">
    {[["all","Tous"],["H","Hommes"],["F","Femmes"]].map(([key,label]) =>
      <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={value === key}>{label}</button>)}
  </div>;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counting, setCounting] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [byCh, setByCh] = useState({});
  const [participants, setParticipants] = useState([]);
  const [endDate, setEndDate] = useState(DEFAULT_COUNTDOWN_END);
  const [filter, setFilter] = useState("all");

  // Filtre "H"/"F" : on écarte les scores des autres AVANT le calcul, donc le
  // barème F1 est recalculé au sein du groupe (1er du groupe = 25 pts).
  const board = useMemo(
    () => buildLeaderboard(counting, filterEntriesByGender(byCh, filter)),
    [counting, byCh, filter]
  );

  const hasGenderData = participants.some((p) => p.gender);

  useEffect(() => {
    (async () => {
      try {
        setEndDate(await fetchCountdownEnd());
        const { data: ch, error: e1 } = await supabase
          .from("challenges")
          .select("*")
          .order("sort_order", { ascending: true });
        if (e1) throw e1;
        const { data: en, error: e2 } = await supabase.from("entries").select("*");
        if (e2) throw e2;
        const { data: pa, error: e3 } = await supabase.from("participants").select("*");
        if (e3) throw e3;

        const allCh = ch || [];
        const map = {};
        attachParticipants(en, indexParticipants(pa)).forEach((e) => {
          (map[e.challenge_id] = map[e.challenge_id] || []).push(e);
        });
        setParticipants(pa || []);

        setCounting(allCh.filter((c) => c.status !== "upcoming"));
        setActiveChallenges(allCh.filter((c) => c.status === "active"));
        setByCh(map);
      } catch (err) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="signal-dot" /> LE CHALLENGE COMMENCE AVEC TOI</p>
          <h1>ACCROCHE-TOI.<br /><span>DÉPASSE-TOI.</span></h1>
          <p className="hero-description">Une salle, des défis et l’envie d’aller plus loin.<br className="desktop-break" /> Donne le meilleur. Fais grimper ton score.</p>
          <Link className="primary-link" href="/defis">Découvrir les défis <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="track track-one" /><div className="track track-two" /><div className="track track-three" /><span className="hero-arrow">↗</span><span className="art-caption">PLUS FORT À CHAQUE DÉFI.</span></div>
        <div className="hero-bottom"><span>TON EFFORT. TES POINTS. TA PLACE.</span><span>CHALLENGES / BASIC FIT</span></div>
      </section>

      <div className="season-strip">
        <div className="season-stat"><strong>{loading ? "—" : participants.length}</strong><span>participants<br />dans le club</span></div>
        <div className="season-stat"><strong>{loading ? "—" : counting.length.toString().padStart(2,"0")}</strong><span>défis comptabilisés<br />au classement</span></div>
        {!loading && !error ? <Countdown endDate={endOfDay(endDate)} /> : <div className="countdown-panel"><span className="eyebrow">CHAQUE EFFORT COMPTE</span><p>Prêt à te dépasser ?</p></div>}
      </div>

      <div className="competition-layout">
        <section className="ranking-section" aria-labelledby="ranking-title">
          <div className="section-heading"><div><p className="eyebrow">LE TABLEAU DES PERFORMANCES</p><h2 id="ranking-title">Le classement<span className="orange-period">.</span></h2></div><GenderFilter value={filter} onChange={setFilter} /></div>
          <p className="section-intro">Tous tes points, tous tes défis. Une place à aller chercher.</p>
          {loading ? <div className="empty-state" role="status">Chargement du classement…</div> :
            error ? <div className="empty-state error-state" role="alert"><h3>Le classement est momentanément indisponible.</h3><p>Réessaie dans quelques instants.</p><button className="primary-link" onClick={() => window.location.reload()}>Réessayer ↗</button></div> :
            board.length === 0 ? <div className="empty-state"><span className="empty-number">01</span><h3>La première place t’attend.</h3><p>{filter === "all" ? "Aucun score pour l’instant. Rendez-vous à la salle pour le premier défi !" : `Aucun participant dans la catégorie ${GENDER_LABEL[filter]}.`}</p>{filter !== "all" && !hasGenderData && <p>Les catégories des participants n’ont pas encore été renseignées.</p>}<Link href="/defis" className="text-link">Voir les défis ↗</Link></div> :
            <>
              <div className="podium">{board.slice(0,3).map((p,i) => <article key={p.id} className={`podium-card podium-${i+1}`}><div className="podium-top"><span className="eyebrow">{i === 0 ? "EN TÊTE" : "SUR LE PODIUM"}</span><span className="podium-rank">0{p.rank}</span></div><span className="athlete-avatar" aria-hidden="true">{p.name.split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("")}</span><h3>{p.name}</h3><p className="podium-score">{p.total}<span> pts</span></p></article>)}</div>
              <div className="leaderboard"><div className="table-caption"><h3>Classement général</h3><span>{board.length} participant{board.length > 1 ? "s" : ""}</span></div><table><caption className="sr-only">Classement général — {filter === "all" ? "Tous" : GENDER_LABEL[filter]}</caption><thead><tr><th scope="col">Rang</th><th scope="col">Participant</th><th scope="col">Points</th></tr></thead><tbody>{board.map(p => <tr key={p.id}><td><span className={p.rank <= 3 ? "rank-number top-rank" : "rank-number"}>{String(p.rank).padStart(2,"0")}</span></td><td>{p.name}</td><td>{p.total}<span className="points-label"> pts</span></td></tr>)}</tbody></table></div>
            </>}
        </section>
        <aside className="challenge-sidebar">
          <div className="section-heading"><div><p className="eyebrow">À TOI DE JOUER</p><h2>Dans l’arène<span className="orange-period">.</span></h2></div></div>
          {loading ? <div className="challenge-preview" role="status">Chargement des défis…</div> : activeChallenges.length ? activeChallenges.map(ch => {
            const ranked = rankChallenge(byCh[ch.id] || [],ch.metric);
            return <article key={ch.id} className="challenge-preview"><div className="challenge-meta"><span className="live-badge"><span className="signal-dot" /> EN COURS</span><span>{METRIC_LABEL[ch.metric]}</span></div><h3>{ch.name}</h3>{ch.description && <p>{ch.description}</p>}<div className="mini-ranking">{ranked.slice(0,3).map(r => <div key={r.id}><span className="mini-rank">{r.rank}</span><strong>{displayName(r.participant)}</strong><span>{r.raw_value}</span></div>)}</div>{ranked.length === 0 && <p>Sois le premier à poser ton score.</p>}<Link className="text-link" href="/defis">Voir les résultats <span aria-hidden="true">↗</span></Link></article>;
          }) : <div className="challenge-preview"><h3>{error ? "Retrouve les défis" : "La suite se prépare."}</h3><p>{error ? "Consulte les épreuves et leurs résultats." : "Découvre les résultats et les prochains rendez-vous du club."}</p><Link className="text-link" href="/defis">Explorer les défis ↗</Link></div>}
          <div className="rules-card"><span className="eyebrow">LE JEU EST SIMPLE</span><h3>Chaque défi.<br />Une nouvelle chance.</h3><p>Le barème F1 récompense les 10 premiers de chaque défi. Les points s’additionnent au classement général.</p><div className="points-podium"><span>1er <strong>25 pts</strong></span><span>2e <strong>18 pts</strong></span><span>3e <strong>15 pts</strong></span></div><p className="rules-footnote">Puis 12, 10, 8, 6, 4, 2 et 1 point.</p></div>
        </aside>
      </div>
      <div className="closing-line"><span>LA PROCHAINE PERFORMANCE,</span><span>C’EST LA TIENNE. ↗</span></div>
    </div>
  );
}
