"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useData } from "@/lib/store";
import {
  rankChallenge,
  METRIC_LABEL,
  STATUS_LABEL,
  displayName,
  indexParticipants,
  attachParticipants,
} from "@/lib/scoring";

function StatusBadge({ status }) {
  const styles = {
    upcoming: "bg-neutral-100 text-neutral-600",
    active: "bg-green-100 text-green-700",
    finished: "bg-bf-light text-bf-dark",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? "bg-neutral-100 text-neutral-600"}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Bannière « propose un défi » — dépôt anonyme                       */
/*  Rien n'est enregistré sur l'auteur : ni nom, ni adresse IP.        */
/*  Les propositions ne sont lisibles que depuis l'espace admin.       */
/* ------------------------------------------------------------------ */
const TITLE_MAX = 120;
const DETAILS_MAX = 1000;
const COOLDOWN_MS = 30_000;

function SuggestionBanner() {
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
      setErr("L’envoi n’a pas abouti. Réessaie dans un instant.");
      return;
    }
    try {
      localStorage.setItem("suggestion-sent-at", String(Date.now()));
    } catch {}
    setTitle("");
    setDetails("");
    setSent(true);
  };

  if (sent) {
    return (
      <div className="suggest-banner suggest-done" role="status">
        <div>
          <strong>Merci, c’est noté.</strong>
          <p>Ton idée part directement à l’équipe. Elle reste anonyme.</p>
        </div>
        <button type="button" className="text-link" onClick={() => setSent(false)}>
          Proposer autre chose
        </button>
      </div>
    );
  }

  return (
    <div className="suggest-banner">
      <div className="suggest-intro">
        <div>
          <span className="eyebrow">Une idée&nbsp;?</span>
          <strong>Propose le prochain défi.</strong>
          <p>Anonyme — on ne garde ni ton nom ni rien qui permette de te reconnaître.</p>
        </div>
        {!open && (
          <button type="button" className="primary-link" onClick={() => setOpen(true)}>
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
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Gainage planche, Burpees en 2 min…"
          />
          <label htmlFor="suggest-details">
            Des précisions <span>(facultatif)</span>
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
            <button className="primary-link" disabled={busy}>
              {busy ? "Envoi…" : "Envoyer"}
            </button>
            <button type="button" className="text-link" onClick={() => setOpen(false)}>
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

export default function DefisPage() {
  // Mêmes données que la page d'accueil, déjà en mémoire au retour.
  const { data, loading, error } = useData();

  const { challenges, entriesByCh } = useMemo(() => {
    if (!data) return { challenges: [], entriesByCh: {} };
    const byCh = {};
    attachParticipants(data.entries, indexParticipants(data.participants)).forEach((e) => {
      (byCh[e.challenge_id] = byCh[e.challenge_id] || []).push(e);
    });
    return { challenges: data.challenges, entriesByCh: byCh };
  }, [data]);

  if (loading) return <p className="text-neutral-500">Chargement des défis…</p>;
  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );

  // Défis passés et en cours : le plus récent en premier.
  // On se fie à la date de fin ; sans date, on retombe sur l'ordre d'affichage.
  const byRecentFirst = (a, b) => {
    if (a.end_date && b.end_date) return b.end_date.localeCompare(a.end_date);
    if (a.end_date) return -1;
    if (b.end_date) return 1;
    return (b.sort_order ?? 0) - (a.sort_order ?? 0);
  };

  const current = challenges
    .filter((c) => c.status !== "upcoming")
    .sort(byRecentFirst);

  // Les défis à venir restent dans l'ordre chronologique : le prochain d'abord,
  // et ceux dont la date n'est pas encore fixée à la fin.
  const bySoonestFirst = (a, b) => {
    if (a.end_date && b.end_date) return a.end_date.localeCompare(b.end_date);
    if (a.end_date) return -1;
    if (b.end_date) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  };

  const upcoming = challenges
    .filter((c) => c.status === "upcoming")
    .sort(bySoonestFirst);

  return (
    <div className="challenge-page space-y-8">
      <div className="page-hero">
        <p className="eyebrow">LE TERRAIN DE JEU DU CLUB / 02</p>
        <h1>RELÈVE LE DÉFI<span className="orange-period">.</span></h1>
        <p className="text-sm text-neutral-500">
          Trouve ton prochain challenge. Découvre les performances du club et les records à dépasser.
        </p>
      </div>

      <SuggestionBanner />

      {current.map((c) => {
        const ranked = rankChallenge(entriesByCh[c.id] || [], c.metric);
        return (
          <section key={c.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold">{c.name}</h2>
              <StatusBadge status={c.status} />
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
                {METRIC_LABEL[c.metric]}
              </span>
              {c.end_date && (
                <span className="ml-auto text-xs text-neutral-400">
                  Fin : {new Date(c.end_date).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
            {c.description && (
              <p className="mt-1 text-sm text-neutral-500">{c.description}</p>
            )}

            {ranked.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                Pas encore de performance enregistrée.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[300px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-2 py-1">Rang</th>
                      <th className="px-2 py-1">Nom</th>
                      <th className="px-2 py-1">
                        {c.metric === "time" ? "Temps" : "Répétitions"}
                      </th>
                      <th className="px-2 py-1 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r) => (
                      <tr key={r.id} className="border-t border-neutral-100">
                        <td className="px-2 py-1.5 font-bold text-neutral-500">
                          <span className={r.rank <= 3 ? "rank-number top-rank" : "rank-number"}>{String(r.rank).padStart(2, "0")}</span>
                        </td>
                        <td className="px-2 py-1.5 font-semibold">
                          {displayName(r.participant)}
                        </td>
                        <td className="px-2 py-1.5 text-neutral-600">{r.raw_value}</td>
                        <td className="text-bf-dark px-2 py-1.5 text-right font-extrabold">
                          {r.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-neutral-700">Prochainement</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{c.name}</h3>
                  <StatusBadge status={c.status} />
                </div>
                {c.description && (
                  <p className="mt-1 text-sm text-neutral-500">{c.description}</p>
                )}
                <p className="mt-2 text-xs text-neutral-400">
                  {METRIC_LABEL[c.metric]}
                  {c.end_date &&
                    ` · prévu le ${new Date(c.end_date).toLocaleDateString("fr-FR")}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {challenges.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-neutral-500 shadow-sm">
          Aucun défi pour l&apos;instant.
        </p>
      )}
    </div>
  );
}
