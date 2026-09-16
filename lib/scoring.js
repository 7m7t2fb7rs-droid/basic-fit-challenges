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
      const key = r.participant_name.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: r.participant_name.trim(), total: 0, per: {} };
      totals[key].total += r.points;
      totals[key].per[ch.id] = r.points;
    }
  }
  const arr = Object.values(totals).sort((a, b) => b.total - a.total);
  return arr.map((p, i) => ({ ...p, rank: i + 1 }));
}

export const METRIC_LABEL = { time: "Temps", reps: "Répétitions" };
export const STATUS_LABEL = {
  upcoming: "À venir",
  active: "En cours",
  finished: "Terminé",
};

// ------------------------------------------------------------------
//  Genre des participants (H / F) — filtre du classement général
// ------------------------------------------------------------------

export const GENDERS = ["H", "F"];
export const GENDER_LABEL = { H: "Hommes", F: "Femmes" };
export const GENDER_SHORT = { H: "H", F: "F" };

// Même normalisation que buildLeaderboard : "Ayoub_13K3" et "Ayoub_13k3"
// sont la même personne.
export function nameKey(name) {
  return String(name || "").trim().toLowerCase();
}

// Le genre est saisi par score, mais c'est une propriété de la personne :
// on le déduit une fois pour toutes à partir de n'importe lequel de ses scores.
// Ainsi, renseigner le genre sur un seul score suffit pour tous les autres.
export function genderByParticipant(entries) {
  const map = {};
  for (const e of entries || []) {
    if (!e.gender) continue;
    const key = nameKey(e.participant_name);
    if (!map[key]) map[key] = e.gender;
  }
  return map;
}

// Ne garde que les scores des participants du genre demandé.
// gender = "all" (ou vide) → tout est conservé.
// Les participants sans genre renseigné n'apparaissent que dans "all".
export function filterEntriesByGender(entriesByChallenge, gender, genderMap) {
  if (!gender || gender === "all") return entriesByChallenge;
  const out = {};
  for (const [chId, list] of Object.entries(entriesByChallenge || {})) {
    const kept = (list || []).filter(
      (e) => genderMap[nameKey(e.participant_name)] === gender
    );
    if (kept.length) out[chId] = kept;
  }
  return out;
}
