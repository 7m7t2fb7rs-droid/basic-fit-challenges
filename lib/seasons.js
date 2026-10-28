import { buildLeaderboard, attachParticipants, indexParticipants, filterEntriesByGender } from "@/lib/scoring";

/* ------------------------------------------------------------------ */
/*  Saisons                                                            */
/*  Une seule saison est ouverte à la fois ; le classement général ne   */
/*  compte que ses défis. Une saison clôturée garde son classement      */
/*  final figé (final_board), qui ne bouge plus ensuite.               */
/* ------------------------------------------------------------------ */

export const openSeason = (seasons) => (seasons || []).find((s) => s.status === "open") || null;

/** Saisons clôturées, la plus récente d'abord. */
export const closedSeasons = (seasons) =>
  (seasons || [])
    .filter((s) => s.status === "closed")
    .sort((a, b) => (b.closed_at || "").localeCompare(a.closed_at || ""));

/** La saison à montrer : l'ouverte, sinon la dernière clôturée. */
export const shownSeason = (seasons) => openSeason(seasons) || closedSeasons(seasons)[0] || null;

/** Défis d'une saison. Sans table des saisons (base pas encore migrée),
 *  tout compte, comme avant. Un défi sans saison est rangé dans
 *  l'ouverte : c'est forcément un oubli de rattachement. */
export function challengesOf(challenges, season, seasons) {
  if (!seasons || seasons.length === 0) return challenges;
  if (!season) return [];
  return challenges.filter(
    (c) => c.season_id === season.id || (!c.season_id && season.status === "open")
  );
}

/** Classement final à figer à la clôture : tous, hommes, femmes. */
export function snapshotBoards(challenges, entries, participants) {
  const counting = challenges.filter((c) => c.status !== "upcoming");
  const ids = new Set(counting.map((c) => c.id));
  const byCh = {};
  for (const e of attachParticipants(entries, indexParticipants(participants))) {
    if (ids.has(e.challenge_id)) (byCh[e.challenge_id] = byCh[e.challenge_id] || []).push(e);
  }
  const slim = (board) => board.map(({ rank, name, total }) => ({ rank, name, total }));
  return {
    all: slim(buildLeaderboard(counting, byCh)),
    H: slim(buildLeaderboard(counting, filterEntriesByGender(byCh, "H"))),
    F: slim(buildLeaderboard(counting, filterEntriesByGender(byCh, "F"))),
    challenges: counting.length,
  };
}
