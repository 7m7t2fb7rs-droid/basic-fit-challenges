// Barème F1 (position -> points). Au-delà de la 10e place : 0 point.
export const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Convertit une performance saisie en nombre comparable.
// - metric "time"  : "2:40" -> 160 (secondes).  Plus grand = mieux.
// - metric "reps"  : "42"   -> 42.               Plus grand = mieux.
export function parseScore(raw, metric) {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw).trim().replace(",", ".");
  if (metric === "time" && s.includes(":")) {
    const parts = s.split(":").map((p) => Number(p));
    if (parts.some((n) => Number.isNaN(n))) return NaN;
    return parts.reduce((acc, n) => acc * 60 + n, 0); // gère m:ss et h:mm:ss
  }
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
}

// Classe les performances d'un défi et attribue les points F1.
// entries: [{ id, participant_name, raw_value }]
export function rankChallenge(entries, metric) {
  const withNum = (entries || [])
    .map((e) => ({ ...e, num: parseScore(e.raw_value, metric) }))
    .filter((e) => !Number.isNaN(e.num));

  withNum.sort((a, b) => b.num - a.num); // plus grand = meilleur

  return withNum.map((e) => {
    const rank = 1 + withNum.filter((o) => o.num > e.num).length; // égalités = même rang
    return { ...e, rank, points: F1_POINTS[rank - 1] || 0 };
  });
}

// Construit le classement général cumulé sur tous les défis fournis.
export function buildLeaderboard(challenges, entriesByChallenge) {
  const totals = {};
  for (const ch of challenges) {
    const ranked = rankChallenge(entriesByChallenge[ch.id] || [], ch.metric);
    for (const r of ranked) {
      const key = r.participant_name;
      if (!totals[key]) totals[key] = { name: key, total: 0, per: {} };
      totals[key].total += r.points;
      totals[key].per[ch.id] = r.points;
    }
  }
  const arr = Object.values(totals).sort((a, b) => b.total - a.total);
  return arr.map((p) => ({
    ...p,
    rank: 1 + arr.filter((o) => o.total > p.total).length,
  }));
}

export const METRIC_LABEL = { time: "Temps", reps: "Répétitions" };
export const STATUS_LABEL = {
  upcoming: "À venir",
  active: "En cours",
  finished: "Terminé",
};
