"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { rankChallenge, METRIC_LABEL, STATUS_LABEL } from "@/lib/scoring";

const MEDAL = ["🥇", "🥈", "🥉"];

function StatusBadge({ status }) {
  const styles = {
    upcoming: "bg-neutral-100 text-neutral-600",
    active: "bg-green-100 text-green-700",
    finished: "bg-bf-light text-bf-dark",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function DefisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [entriesByCh, setEntriesByCh] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data: ch, error: e1 } = await supabase
          .from("challenges")
          .select("*")
          .order("sort_order", { ascending: true });
        if (e1) throw e1;
        const { data: en, error: e2 } = await supabase.from("entries").select("*");
        if (e2) throw e2;
        const byCh = {};
        (en || []).forEach((e) => {
          (byCh[e.challenge_id] = byCh[e.challenge_id] || []).push(e);
        });
        setChallenges(ch || []);
        setEntriesByCh(byCh);
      } catch (err) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-neutral-500">Chargement des défis…</p>;
  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );

  const current = challenges.filter((c) => c.status !== "upcoming");
  const upcoming = challenges.filter((c) => c.status === "upcoming");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Les défis</h1>
        <p className="text-sm text-neutral-500">
          Résultats des défis en cours et terminés, et ce qui arrive.
        </p>
      </div>

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
                <table className="w-full text-sm">
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
                          {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
                        </td>
                        <td className="px-2 py-1.5 font-semibold">
                          {r.participant_name}
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
