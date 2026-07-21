"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { buildLeaderboard, rankChallenge, METRIC_LABEL } from "@/lib/scoring";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [byCh, setByCh] = useState({});

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

        const allCh = ch || [];
        const map = {};
        (en || []).forEach((e) => {
          (map[e.challenge_id] = map[e.challenge_id] || []).push(e);
        });

        const counting = allCh.filter((c) => c.status !== "upcoming");
        setChallenges(counting);
        setBoard(buildLeaderboard(counting, map));
        setActiveChallenges(allCh.filter((c) => c.status === "active"));
        setByCh(map);
      } catch (err) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-neutral-500">Chargement du classement…</p>;
  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
        <p className="mt-2 text-red-500">
          Vérifie que la base Supabase est configurée (voir README).
        </p>
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Classement général</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Pendant 3 mois, plusieurs défis sont proposés à la salle. Chaque participation rapporte des points et te permet de grimper au classement — le total ici reflète l&apos;ensemble de tes points sur tous les défis.
        </p>
      </div>

      {/* Défi en cours */}
      {activeChallenges.length > 0 && (
        <div className="space-y-3">
          {activeChallenges.map((ch) => {
            const ranked = rankChallenge(byCh[ch.id] || [], ch.metric);
            return (
              <div key={ch.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start gap-2 mb-3">
                  <span className="inline-block mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-400 animate-pulse" />
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{ch.name}</h2>
                    <span className="text-xs text-green-600 font-semibold">En cours</span>
                  </div>
                  <span className="ml-auto text-xs text-neutral-400 uppercase tracking-wide">
                    {METRIC_LABEL[ch.metric]}
                  </span>
                </div>
                {ch.description && (
                  <p className="mb-3 text-sm text-neutral-500">{ch.description}</p>
                )}
                {ranked.length === 0 ? (
                  <p className="text-sm text-neutral-400">Aucun score pour l&apos;instant — sois le premier !</p>
                ) : (
                  <div className="space-y-1">
                    {ranked.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-center font-bold text-neutral-400">{r.rank}</span>
                        <span className="flex-1 font-semibold">{r.participant_name}</span>
                        <span className="text-neutral-500">{r.raw_value}</span>
                        <span className="w-10 text-right font-extrabold text-bf-dark">{r.points} pts</span>
                      </div>
                    ))}
                    {ranked.length > 5 && (
                      <p className="text-xs text-neutral-400 pt-1">+{ranked.length - 5} autres participants</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {board.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-neutral-500 shadow-sm">
          Aucun score pour l&apos;instant. Reviens après le premier défi !
        </p>
      ) : (
        <>
          {/* Podium — horizontal même sur mobile, compact */}
          <div className="grid grid-cols-3 gap-2">
            {board.slice(0, 3).map((p, i) => (
              <div
                key={p.name}
                className={`rounded-2xl px-2 py-3 text-center shadow-sm ${
                  i === 0
                    ? "bg-gradient-to-b from-amber-100 to-white ring-2 ring-amber-300"
                    : "bg-white"
                }`}
              >
                <div className="text-2xl">{MEDAL[i]}</div>
                <div className="mt-1 text-sm font-bold leading-tight truncate">{p.name}</div>
                <div className="text-bf-dark font-extrabold text-xl">{p.total}</div>
                <div className="text-xs uppercase tracking-wide text-neutral-400">pts</div>
              </div>
            ))}
          </div>

          {/* Tableau complet */}
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bf-orange text-white">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Nom</th>
                  {challenges.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-center font-semibold">
                      {c.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {board.map((p) => (
                  <tr key={p.name} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-bold text-neutral-500">{p.rank}</td>
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    {challenges.map((c) => (
                      <td key={c.id} className="px-3 py-2 text-center text-neutral-500">
                        {p.per[c.id] ?? "—"}
                      </td>
                    ))}
                    <td className="text-bf-dark px-3 py-2 text-center font-extrabold">
                      {p.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
