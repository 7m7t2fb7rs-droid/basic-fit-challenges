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
// entries: [{ id, participant_id, participant, raw_value }]
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
// Le regroupement se fait sur l'identifiant de la fiche : deux personnes
// portant le même prénom restent deux lignes distinctes.
export function buildLeaderboard(challenges, entriesByChallenge) {
  const totals = {};
  for (const ch of challenges) {
    const ranked = rankChallenge(entriesByChallenge[ch.id] || [], ch.metric);
    for (const r of ranked) {
      const key = r.participant_id;
      if (!key) continue;
      if (!totals[key]) {
        totals[key] = {
          id: key,
          name: displayName(r.participant),
          gender: r.participant?.gender || null,
          total: 0,
          per: {},
        };
      }
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

export const GENDER_LABEL = { H: "Hommes", F: "Femmes" };

// Nom affiché : le nom de famille n'apparaît que s'il a été renseigné,
// c'est-à-dire en général quand il faut distinguer deux homonymes.
export function displayName(participant) {
  if (!participant) return "—";
  const last = (participant.last_name || "").trim();
  const first = (participant.first_name || "").trim();
  return last ? `${first} ${last}` : first;
}

// Indexe les fiches par identifiant.
export function indexParticipants(participants) {
  const byId = {};
  for (const p of participants || []) byId[p.id] = p;
  return byId;
}

// Accroche sa fiche à chaque score, pour que l'affichage et les filtres
// n'aient plus à faire la jointure eux-mêmes.
export function attachParticipants(entries, participantsById) {
  return (entries || []).map((e) => ({
    ...e,
    participant: participantsById[e.participant_id] || null,
  }));
}

// Ne garde que les scores des personnes du genre demandé.
// gender = "all" (ou vide) → tout est conservé.
// Les personnes sans genre renseigné n'apparaissent que dans "all".
export function filterEntriesByGender(entriesByChallenge, gender) {
  if (!gender || gender === "all") return entriesByChallenge;
  const out = {};
  for (const [chId, list] of Object.entries(entriesByChallenge || {})) {
    const kept = (list || []).filter((e) => e.participant?.gender === gender);
    if (kept.length) out[chId] = kept;
  }
  return out;
}

// Normalisation pour la recherche : insensible à la casse et aux accents,
// pour que « maelle » retrouve « Maëlle ».
export function nameKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Fiches dont le prénom ou le nom commence par ce qui est tapé.
// Sert à prévenir l'admin qu'une personne du même nom existe déjà.
export function matchParticipants(participants, query) {
  const q = nameKey(query);
  if (!q) return [];
  return (participants || [])
    .filter((p) => {
      const first = nameKey(p.first_name);
      const last = nameKey(p.last_name);
      return (
        first.startsWith(q) ||
        last.startsWith(q) ||
        nameKey(displayName(p)).includes(q)
      );
    })
    .sort((a, b) => displayName(a).localeCompare(displayName(b), "fr"));
}
