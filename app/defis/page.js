"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useData } from "@/lib/store";
import {
  rankChallenge,
  formatScore,
  METRIC_LABEL,
  displayName,
  indexParticipants,
  attachParticipants,
} from "@/lib/scoring";

/* "2026-10-16" → « 16 octobre ». Midi évite qu'un fuseau décalé recule
   la date d'un jour. */
const dayMonth = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/* ------------------------------------------------------------------ */
/*  Proposer un défi — dépôt anonyme                                   */
/*  Rien n'est enregistré sur l'auteur : ni nom, ni adresse IP.        */
/*  Les propositions ne sont lisibles que depuis l'espace admin.       */
/* ------------------------------------------------------------------ */
const TITLE_MAX = 120;
const DETAILS_MAX = 1000;
const COOLDOWN_MS = 30_000;

function SuggestionCard() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (t.length < 3) {
      setErr("Donne un titre d’au moins 3 caractères.");
      return;
    }
    // Garde-fou contre le double-envoi et le remplissage en rafale.
    try {
      const last = Number(localStorage.getItem("suggestion-sent-at") || 0);
      if (Date.now() - last < COOLDOWN_MS) {
        setErr("Tu viens déjà d’envoyer une idée — laisse passer quelques secondes.");
        return;
      }
    } catch {
      // navigation privée : on laisse passer, la base a ses propres limites
    }
    setErr(null);
    setBusy(true);
    const { error } = await supabase
      .from("suggestions")
      .insert({ title: t, details: details.trim() || null });
    setBusy(false);
    if (error) {
      // Limite anti-spam posée en base (supabase-securite.sql).
      const limited = String(error.message || "").includes("suggestions_rate_limited");
      setErr(
        limited
          ? "Beaucoup d’idées sont arrivées d’un coup — réessaie un peu plus tard."
          : "L’envoi n’a pas abouti. Réessaie dans un instant."
      );
      return;
    }
    try {
      localStorage.setItem("suggestion-sent-at", String(Date.now()));
    } catch {}
    setTitle("");
    setDetails("");
    setOpen(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="card suggest done" role="status">
        <div className="suggest-top">
          <div>
            <strong>Merci, c’est noté.</strong>
            <p>Ton idée est transmise à l’équipe, sans ton nom.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>
            Proposer autre chose
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card suggest">
      <div className="suggest-top">
        <div>
          <strong>Une idée de défi ?</strong>
          <p>Propose-la à l’équipe. C’est anonyme : aucun nom n’est enregistré.</p>
        </div>
        {!open && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            Proposer un défi
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="suggest-form">
          <label htmlFor="suggest-title">Le défi</label>
          <input
            id="suggest-title"
            required
            autoFocus
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Burpees en 2 minutes"
          />
          <label htmlFor="suggest-details">
            Précisions <span>(facultatif)</span>
          </label>
          <textarea
            id="suggest-details"
            rows={3}
            maxLength={DETAILS_MAX}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Comment on le mesure, une règle particulière…"
          />
          <div className="suggest-actions">
            <button className="btn" disabled={busy}>
              {busy ? "Envoi…" : "Envoyer"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <span className="suggest-count">
              {details.length}/{DETAILS_MAX}
            </span>
          </div>
          {err && (
            <p className="suggest-error" role="alert">
              {err}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/* Tableau des résultats d'un défi. */
function Results({ ranked, metric }) {
  if (ranked.length === 0) {
    return <p className="ch-desc" style={{ marginTop: 12 }}>Pas encore de score.</p>;
  }
  return (
    <table className="results">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Nom</th>
          <th scope="col">{METRIC_LABEL[metric]}</th>
          <th scope="col">Points</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map((r) => (
          <tr key={r.id} className={r.rank <= 3 ? "top" : undefined}>
            <td className="r">{r.rank}</td>
            <td className="n">{displayName(r.participant)}</td>
            <td className="v">{formatScore(r.raw_value, metric)}</td>
            <td>{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DefisPage() {
  // Mêmes données que la page d'accueil, déjà en mémoire au retour.
  const { data, loading, error, refresh } = useData();

  const groups = useMemo(() => {
    if (!data) return null;
    const byCh = {};
    attachParticipants(data.entries, indexParticipants(data.participants)).forEach((e) => {
      (byCh[e.challenge_id] = byCh[e.challenge_id] || []).push(e);
    });
    const withResults = (c) => ({ ...c, ranked: rankChallenge(byCh[c.id] || [], c.metric) });

    // Le plus récent d'abord ; sans date, on retombe sur l'ordre d'affichage.
    const recentFirst = (a, b) => {
      if (a.end_date && b.end_date) return b.end_date.localeCompare(a.end_date);
      if (a.end_date) return -1;
      if (b.end_date) return 1;
      return (b.sort_order ?? 0) - (a.sort_order ?? 0);
    };
    // À venir : le prochain d'abord, les dates non fixées à la fin.
    const soonestFirst = (a, b) => {
      if (a.end_date && b.end_date) return a.end_date.localeCompare(b.end_date);
      if (a.end_date) return -1;
      if (b.end_date) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    };

    const all = data.challenges;
    return {
      active: all.filter((c) => c.status === "active").sort(recentFirst).map(withResults),
      finished: all.filter((c) => c.status === "finished").sort(recentFirst).map(withResults),
      upcoming: all.filter((c) => c.status === "upcoming").sort(soonestFirst),
    };
  }, [data]);

  return (
    <>
      <div className="page-head">
        <h1>Défis</h1>
        <p>Les résultats de chaque défi, et ceux qui arrivent.</p>
      </div>

      {loading ? (
        <div className="card empty" role="status">
          Chargement des défis…
        </div>
      ) : error ? (
        <div className="card empty" role="alert">
          <strong>Les défis n’ont pas pu être chargés.</strong>
          <p>Vérifie ta connexion, puis réessaie.</p>
          <button className="btn" style={{ marginTop: 14 }} onClick={() => refresh()}>
            Réessayer
          </button>
        </div>
      ) : (
        <div className="challenges">
          {groups.active.length > 0 && (
            <section aria-labelledby="t-active">
              <h2 id="t-active" className="section-title">En cours</h2>
              {groups.active.map((c) => (
                <article key={c.id} className="card ch">
                  <div className="ch-head">
                    <h3>{c.name}</h3>
                    <span className="ch-meta">
                      {METRIC_LABEL[c.metric]}
                      {c.end_date && ` · jusqu’au ${dayMonth(c.end_date)}`}
                    </span>
                  </div>
                  {c.description && <p className="ch-desc">{c.description}</p>}
                  <Results ranked={c.ranked} metric={c.metric} />
                </article>
              ))}
            </section>
          )}

          {groups.finished.length > 0 && (
            <section aria-labelledby="t-finished">
              <h2 id="t-finished" className="section-title">Terminés</h2>
              {groups.finished.map((c) => {
                // Plusieurs premiers ex æquo : on les cite tous.
                const winners = c.ranked.filter((r) => r.rank === 1);
                return (
                  <details key={c.id} className="card ch">
                    <summary>
                      <div className="ch-sum">
                        <h3>{c.name}</h3>
                        <span className="ch-meta">
                          {winners.length
                            ? `Vainqueur : ${winners.map((w) => displayName(w.participant)).join(" et ")}, ${formatScore(winners[0].raw_value, c.metric)}`
                            : "Aucun score"}
                          {c.end_date && ` · ${dayMonth(c.end_date)}`}
                        </span>
                      </div>
                    </summary>
                    {c.description && <p className="ch-desc">{c.description}</p>}
                    <Results ranked={c.ranked} metric={c.metric} />
                  </details>
                );
              })}
            </section>
          )}

          {groups.upcoming.length > 0 && (
            <section aria-labelledby="t-upcoming">
              <h2 id="t-upcoming" className="section-title">À venir</h2>
              <ul className="card upcoming">
                {groups.upcoming.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong>
                    <span>
                      {METRIC_LABEL[c.metric]}
                      {c.end_date && ` · ${dayMonth(c.end_date)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {groups.active.length + groups.finished.length + groups.upcoming.length === 0 && (
            <div className="card empty">Aucun défi pour l’instant.</div>
          )}

          <SuggestionCard />
        </div>
      )}
    </>
  );
}
