"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/store";
import {
  buildLeaderboard,
  rankChallenge,
  formatScore,
  GENDER_LABEL,
  F1_POINTS,
  displayName,
  indexParticipants,
  attachParticipants,
  filterEntriesByGender,
  rankMoves,
} from "@/lib/scoring";
import { openSeason, closedSeasons, challengesOf } from "@/lib/seasons";
import FinalBoard from "./FinalBoard";
import { endOfDay } from "@/lib/settings";

const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

/* « Fin de saison le 1er décembre, dans 34 jours. » Recalculé chaque
   minute : un compteur à la seconde n'apporte rien à un classement. */
function useSeasonText(endIso) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!endIso || !now) return null;

  const end = endOfDay(endIso);
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
  }).formatToParts(end);
  const day = parts.find((p) => p.type === "day").value;
  const month = parts.find((p) => p.type === "month").value;
  const date = `${day === "1" ? "1er" : day} ${month}`;

  const left = end.getTime() - now;
  if (left <= 0) return `Saison terminée le ${date}.`;
  const days = Math.floor(left / 86_400_000);
  if (days === 0) return `Dernier jour de la saison.`;
  return `Fin de saison le ${date}, dans ${days} jour${days > 1 ? "s" : ""}.`;
}

/* ------------------------------------------------------------------ */
/*  Fiche d'un participant : ses défis et ses performances            */
/* ------------------------------------------------------------------ */
function ParticipantSheet({ person, rows, onClose }) {
  const sheetRef = useRef(null);
  const closeRef = useRef(null);

  // À l'ouverture, le focus entre dans la fiche ; à la fermeture, il revient
  // sur le nom qui l'a ouverte. Indispensable au clavier et au lecteur d'écran.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Échap ferme la fiche, Tab reste à l'intérieur, et on bloque le
  // défilement derrière.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-name"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <h2 id="sheet-name">{person.name}</h2>
            <p>
              {ordinal(person.rank)} · {person.total} pts sur {rows.length} défi
              {rows.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="Fermer la fiche"
          >
            ×
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="empty">Aucune performance enregistrée pour l’instant.</p>
        ) : (
          <ul className="sheet-list">
            {rows.map((r) => (
              <li key={r.id}>
                <div className="what">
                  <strong>{r.challengeName}</strong>
                  <span>
                    {formatScore(r.raw_value, r.metric)} · {ordinal(r.rank)}
                  </span>
                </div>
                <span className="pts">{r.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* Flèche d'évolution, à côté du nom : ▲ 2 = gagne deux places depuis le
   dernier défi. Rien quand la place ne change pas. */
function Move({ move }) {
  if (!move || move.delta === 0) return null;
  if (move.isNew) return <span className="move move-new">nouveau</span>;
  const up = move.delta > 0;
  const n = Math.abs(move.delta);
  return (
    <span className={up ? "move move-up" : "move move-down"}>
      <span aria-hidden="true">{up ? "▲" : "▼"} {n}</span>
      <span className="sr-only">
        {up ? "gagne" : "perd"} {n} place{n > 1 ? "s" : ""}
      </span>
    </span>
  );
}

function GenderFilter({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Catégorie du classement">
      {[["all", "Tous"], ["H", "Hommes"], ["F", "Femmes"]].map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={value === key}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function HomePage() {
  // Données partagées avec la page des défis : au retour, rien à recharger.
  const { data, loading, error, refresh } = useData();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  // Seuls les défis de la saison ouverte comptent. Entre deux saisons
  // (la dernière clôturée, la suivante pas encore ouverte), on montre le
  // classement final figé de celle qui vient de finir.
  const current = openSeason(data?.seasons);
  const lastClosed = closedSeasons(data?.seasons)[0] || null;
  const betweenSeasons = !!data && data.seasons.length > 0 && !current;
  const seasonText = useSeasonText(current ? current.end_date : data?.countdownEnd);

  const { counting, activeChallenges, byCh } = useMemo(() => {
    if (!data) return { counting: [], activeChallenges: [], byCh: {} };
    const map = {};
    attachParticipants(data.entries, indexParticipants(data.participants)).forEach((e) => {
      (map[e.challenge_id] = map[e.challenge_id] || []).push(e);
    });
    const mine = challengesOf(data.challenges, openSeason(data.seasons), data.seasons);
    return {
      counting: mine.filter((c) => c.status !== "upcoming"),
      activeChallenges: mine.filter((c) => c.status === "active"),
      byCh: map,
    };
  }, [data]);

  // Filtre "H"/"F" : on écarte les scores des autres AVANT le calcul, donc le
  // barème est recalculé au sein du groupe (1er du groupe = 25 pts).
  const filtered = useMemo(() => filterEntriesByGender(byCh, filter), [byCh, filter]);
  const board = useMemo(() => buildLeaderboard(counting, filtered), [counting, filtered]);
  // Flèches : évolution de chacun depuis le dernier défi, dans la même
  // catégorie que le classement affiché.
  const moves = useMemo(() => rankMoves(counting, filtered), [counting, filtered]);
  // Participants qui ont au moins un score cette saison.
  const participants = useMemo(
    () => buildLeaderboard(counting, byCh).length,
    [counting, byCh]
  );
  const selected = board.find((p) => p.id === selectedId) || null;

  // Détail d'un participant, calculé sur les MÊMES scores que le classement
  // affiché : les points de la fiche totalisent donc bien ceux du tableau.
  const sheetRows = useMemo(() => {
    if (!selectedId) return [];
    const rows = [];
    for (const ch of counting) {
      const ranked = rankChallenge(filtered[ch.id] || [], ch.metric);
      const mine = ranked.find((r) => r.participant_id === selectedId);
      if (mine) {
        rows.push({
          id: mine.id,
          challengeName: ch.name,
          metric: ch.metric,
          raw_value: mine.raw_value,
          rank: mine.rank,
          points: mine.points,
          end_date: ch.end_date,
        });
      }
    }
    // Le plus récent d'abord, comme sur la page des défis.
    return rows.sort((a, b) => (b.end_date || "").localeCompare(a.end_date || ""));
  }, [selectedId, counting, filtered]);

  // Le filtre peut retirer du classement la personne dont la fiche est ouverte.
  useEffect(() => {
    if (selectedId && !board.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [board, selectedId]);

  return (
    <>
      <div className="page-head home-head">
        <div>
          <h1>Classement</h1>
          {data &&
            (betweenSeasons ? (
              <p>La {lastClosed?.name || "saison"} est terminée. La suivante arrive bientôt.</p>
            ) : (
              <p>
                {current && `${current.name} · `}
                {participants} participant{participants > 1 ? "s" : ""}, {counting.length} défi
                {counting.length > 1 ? "s" : ""}. {seasonText}
              </p>
            ))}
        </div>
        <GenderFilter value={filter} onChange={setFilter} />
      </div>

      <div className="home-layout">
        <section aria-labelledby="board-title">
          {loading ? (
            <div className="card empty" role="status">
              Chargement du classement…
            </div>
          ) : error ? (
            <div className="card empty" role="alert">
              <strong>Le classement n’a pas pu être chargé.</strong>
              <p>Vérifie ta connexion, puis réessaie.</p>
              <button className="btn" style={{ marginTop: 14 }} onClick={() => refresh()}>
                Réessayer
              </button>
            </div>
          ) : betweenSeasons ? (
            <FinalBoard season={lastClosed} filter={filter} titleId="board-title" />
          ) : board.length === 0 ? (
            <div className="card empty">
              <strong>
                {filter === "all"
                  ? "Aucun score pour l’instant."
                  : `Personne dans la catégorie ${GENDER_LABEL[filter]} pour l’instant.`}
              </strong>
              Les points apparaîtront ici dès le premier défi.
            </div>
          ) : (
            <div className="card board">
              {/* Titre explicite : sur mobile, le classement du défi en cours
                  est juste au-dessus et pourrait être pris pour celui-ci. */}
              <div className="board-head">
                <h2 id="board-title">Classement général</h2>
                <p>
                  Points cumulés sur les défis de la saison
                  {moves && ` · flèches : depuis le défi ${moves.since.name.trim()}`}
                </p>
              </div>
              <table>
                <caption className="sr-only">
                  Classement général — {filter === "all" ? "Tous" : GENDER_LABEL[filter]}. Touche
                  un nom pour voir ses défis.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="rank">#</th>
                    <th scope="col">Participant</th>
                    <th scope="col">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((p) => (
                    <tr
                      key={p.id}
                      className={[p.rank <= 3 && "top", p.rank === 1 && "lead"].filter(Boolean).join(" ")}
                    >
                      <td className="rank">{p.rank}</td>
                      <td>
                        <button type="button" className="row-btn" onClick={() => setSelectedId(p.id)}>
                          {p.name}
                          {moves && <Move move={moves.moves[p.id]} />}
                        </button>
                      </td>
                      <td className="pts">
                        {p.total}
                        <small>pts</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="side">
          {activeChallenges.map((ch) => {
            const ranked = rankChallenge(byCh[ch.id] || [], ch.metric);
            return (
              <article key={ch.id} className="card live">
                <span className="live-tag">Défi en cours</span>
                <h3>{ch.name}</h3>
                {ch.description && <p>{ch.description}</p>}
                {ranked.length > 0 ? (
                  <ol className="mini">
                    {ranked.slice(0, 3).map((r) => (
                      <li key={r.id}>
                        <span>{r.rank}</span>
                        <strong>{displayName(r.participant)}</strong>
                        <span>{formatScore(r.raw_value, ch.metric)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ margin: "12px 0" }}>Pas encore de score.</p>
                )}
                <Link className="link" href="/defis">
                  Tous les résultats
                </Link>
              </article>
            );
          })}

          {closedSeasons(data?.seasons).length > 0 && (
            <div className="card rules">
              <strong>Saisons précédentes</strong>
              <ul className="past">
                {closedSeasons(data.seasons).map((s) => (
                  <li key={s.id}>
                    {s.name}
                    <span>{s.final_board?.all?.[0]?.name || "—"}</span>
                  </li>
                ))}
              </ul>
              <Link className="link" href="/saisons">
                Voir les classements finaux
              </Link>
            </div>
          )}

          <div className="card rules">
            <strong>Comment marchent les points</strong>
            Les 10 premiers de chaque défi marquent {F1_POINTS.slice(0, -1).join(", ")} et{" "}
            {F1_POINTS.at(-1)} point. Les points s’additionnent d’un défi à l’autre et repartent de zéro à chaque saison.
          </div>
        </aside>
      </div>

      {selected && (
        <ParticipantSheet person={selected} rows={sheetRows} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
