"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useData } from "@/lib/store";
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
import { endOfDay } from "@/lib/settings";

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
  return (
    <div className="countdown-panel">
      <span className="eyebrow">{done ? "Saison terminée" : "Fin du classement"}</span>
      {done ? (
        <p className="countdown-done">Bravo à tous les participants.</p>
      ) : (
        <div className="countdown">
          {[[days, "jours"], [hours, "heures"], [minutes, "min"], [seconds, "sec"]].map(
            ([v, label]) => (
              <div key={label}>
                <strong>{String(v).padStart(2, "0")}</strong>
                <span>{label}</span>
              </div>
            )
          )}
        </div>
      )}
      <span className="countdown-date">
        {endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
      </span>
    </div>
  );
}

function GenderFilter({ value, onChange }) {
  return (
    <div className="filter-tabs" aria-label="Catégorie du classement">
      {[["all", "Tous"], ["H", "Hommes"], ["F", "Femmes"]].map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={value === key}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fiche d'un participant : ses défis et ses performances            */
/* ------------------------------------------------------------------ */
function ParticipantSheet({ person, rows, onClose }) {
  // Échap ferme la fiche, et on bloque le défilement derrière.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
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
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-name"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <span className="eyebrow">Rang {String(person.rank).padStart(2, "0")}</span>
            <h2 id="sheet-name">{person.name}</h2>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer la fiche">
            ×
          </button>
        </div>

        <div className="sheet-total">
          <strong>{person.total}</strong>
          <span>
            points sur {rows.length} défi{rows.length > 1 ? "s" : ""}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="sheet-empty">Aucune performance enregistrée pour l’instant.</p>
        ) : (
          <ul className="sheet-list">
            {rows.map((r) => (
              <li key={r.id}>
                <div className="sheet-row-main">
                  <strong>{r.challengeName}</strong>
                  <span className="sheet-points">{r.points} pts</span>
                </div>
                <div className="sheet-row-meta">
                  <span>{METRIC_LABEL[r.metric]}</span>
                  <span className="sheet-perf">{r.raw_value}</span>
                  <span>{r.rank}<sup>{r.rank === 1 ? "er" : "e"}</sup> du défi</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link className="text-link" href="/defis" onClick={onClose}>
          Voir tous les défis
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  // Données partagées avec la page des défis : au retour, rien à recharger.
  const { data, loading, error } = useData();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const participants = data?.participants || [];
  const endDate = data?.countdownEnd;

  const { counting, activeChallenges, byCh } = useMemo(() => {
    if (!data) return { counting: [], activeChallenges: [], byCh: {} };
    const map = {};
    attachParticipants(data.entries, indexParticipants(data.participants)).forEach((e) => {
      (map[e.challenge_id] = map[e.challenge_id] || []).push(e);
    });
    return {
      counting: data.challenges.filter((c) => c.status !== "upcoming"),
      activeChallenges: data.challenges.filter((c) => c.status === "active"),
      byCh: map,
    };
  }, [data]);

  // Filtre "H"/"F" : on écarte les scores des autres AVANT le calcul, donc le
  // barème F1 est recalculé au sein du groupe (1er du groupe = 25 pts).
  const filtered = useMemo(() => filterEntriesByGender(byCh, filter), [byCh, filter]);
  const board = useMemo(() => buildLeaderboard(counting, filtered), [counting, filtered]);

  const hasGenderData = participants.some((p) => p.gender);
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
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="signal-dot" /> Challenges Basic Fit
          </p>
          <h1>
            Accroche-toi.
            <br />
            <span>Dépasse-toi.</span>
          </h1>
          <p className="hero-description">
            Une salle, des défis, et l’envie d’aller plus loin. Chaque participation rapporte
            des points au classement général.
          </p>
          <Link className="primary-link" href="/defis">
            Découvrir les défis
          </Link>
        </div>
      </section>

      <div className="season-strip">
        <div className="season-stat">
          <strong>{loading ? "—" : participants.length}</strong>
          <span>participants</span>
        </div>
        <div className="season-stat">
          <strong>{loading ? "—" : String(counting.length).padStart(2, "0")}</strong>
          <span>défis comptabilisés</span>
        </div>
        {!loading && !error ? (
          <Countdown endDate={endOfDay(endDate)} />
        ) : (
          <div className="countdown-panel">
            <span className="eyebrow">Chaque effort compte</span>
          </div>
        )}
      </div>

      <div className="competition-layout">
        <section className="ranking-section" aria-labelledby="ranking-title">
          <div className="section-heading">
            <div>
              <h2 id="ranking-title">
                Le classement<span className="orange-period">.</span>
              </h2>
              <p className="section-intro">Touche un nom pour voir ses défis.</p>
            </div>
            <GenderFilter value={filter} onChange={setFilter} />
          </div>

          {loading ? (
            <div className="empty-state" role="status">
              Chargement du classement…
            </div>
          ) : error ? (
            <div className="empty-state error-state" role="alert">
              <h3>Le classement est momentanément indisponible.</h3>
              <p>Réessaie dans quelques instants.</p>
              <button className="primary-link" onClick={() => window.location.reload()}>
                Réessayer
              </button>
            </div>
          ) : board.length === 0 ? (
            <div className="empty-state">
              <h3>La première place t’attend.</h3>
              <p>
                {filter === "all"
                  ? "Aucun score pour l’instant. Rendez-vous à la salle pour le premier défi !"
                  : `Aucun participant dans la catégorie ${GENDER_LABEL[filter]}.`}
              </p>
              {filter !== "all" && !hasGenderData && (
                <p>Les catégories des participants n’ont pas encore été renseignées.</p>
              )}
              <Link href="/defis" className="text-link">
                Voir les défis
              </Link>
            </div>
          ) : (
            <>
              <div className="podium">
                {board.slice(0, 3).map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`podium-card podium-${p.rank}`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <span className="podium-rank">{String(p.rank).padStart(2, "0")}</span>
                    <span className="podium-name">{p.name}</span>
                    <span className="podium-score">
                      {p.total}
                      <span> pts</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="leaderboard">
                <div className="table-caption">
                  <h3>Classement général</h3>
                  <span>
                    {board.length} participant{board.length > 1 ? "s" : ""}
                  </span>
                </div>
                <table>
                  <caption className="sr-only">
                    Classement général — {filter === "all" ? "Tous" : GENDER_LABEL[filter]}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Rang</th>
                      <th scope="col">Participant</th>
                      <th scope="col">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className={p.rank <= 3 ? "rank-number top-rank" : "rank-number"}>
                            {String(p.rank).padStart(2, "0")}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="row-link"
                            onClick={() => setSelectedId(p.id)}
                          >
                            {p.name}
                          </button>
                        </td>
                        <td>
                          {p.total}
                          <span className="points-label"> pts</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="challenge-sidebar">
          <div className="section-heading">
            <h2>
              Dans l’arène<span className="orange-period">.</span>
            </h2>
          </div>
          {loading ? (
            <div className="challenge-preview" role="status">
              Chargement des défis…
            </div>
          ) : activeChallenges.length ? (
            activeChallenges.map((ch) => {
              const ranked = rankChallenge(byCh[ch.id] || [], ch.metric);
              return (
                <article key={ch.id} className="challenge-preview">
                  <div className="challenge-meta">
                    <span className="live-badge">
                      <span className="signal-dot" /> En cours
                    </span>
                    <span>{METRIC_LABEL[ch.metric]}</span>
                  </div>
                  <h3>{ch.name}</h3>
                  {ch.description && <p>{ch.description}</p>}
                  <div className="mini-ranking">
                    {ranked.slice(0, 3).map((r) => (
                      <div key={r.id}>
                        <span className="mini-rank">{r.rank}</span>
                        <strong>{displayName(r.participant)}</strong>
                        <span>{r.raw_value}</span>
                      </div>
                    ))}
                  </div>
                  {ranked.length === 0 && <p>Sois le premier à poser ton score.</p>}
                  <Link className="text-link" href="/defis">
                    Voir les résultats
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="challenge-preview">
              <h3>{error ? "Retrouve les défis" : "La suite se prépare."}</h3>
              <p>
                {error
                  ? "Consulte les épreuves et leurs résultats."
                  : "Découvre les résultats et les prochains rendez-vous du club."}
              </p>
              <Link className="text-link" href="/defis">
                Explorer les défis
              </Link>
            </div>
          )}

          <div className="rules-card">
            <span className="eyebrow">Le jeu est simple</span>
            <h3>Chaque défi, une nouvelle chance.</h3>
            <p>
              Le barème récompense les 10 premiers de chaque défi. Les points s’additionnent au
              classement général.
            </p>
            <div className="points-podium">
              <span>
                1er <strong>25 pts</strong>
              </span>
              <span>
                2e <strong>18 pts</strong>
              </span>
              <span>
                3e <strong>15 pts</strong>
              </span>
            </div>
            <p className="rules-footnote">Puis 12, 10, 8, 6, 4, 2 et 1 point.</p>
          </div>
        </aside>
      </div>

      {selected && (
        <ParticipantSheet
          person={selected}
          rows={sheetRows}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
