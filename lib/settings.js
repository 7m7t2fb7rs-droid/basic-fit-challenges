import { supabase } from "@/lib/supabaseClient";

/** Date utilisée tant qu'aucune valeur n'est enregistrée en base. */
export const DEFAULT_COUNTDOWN_END = "2026-09-25";

export const COUNTDOWN_KEY = "countdown_end";

/** "2026-09-25" → l'instant du 25/09/2026 à 23:59:59, heure de Paris. */
/*  Le club est en France : tout le monde voit le même compte à rebours,
    quel que soit le fuseau du téléphone (même règle que lib/gym.js).
    Toute valeur illisible retombe sur la date par défaut : mieux vaut un
    compte à rebours faux d'un jour qu'un affichage « NaN ».              */
export function endOfDay(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ""));
  const [y, m, d] = (
    match ? match.slice(1) : DEFAULT_COUNTDOWN_END.split("-")
  ).map(Number);
  // On part de 23:59:59 en UTC, puis on retire le décalage de Paris à ce
  // moment-là (+1 h en hiver, +2 h en été).
  const asUtc = Date.UTC(y, m - 1, d, 23, 59, 59);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(asUtc));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const parisAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(asUtc - (parisAsUtc - asUtc));
}

/** Écrit n'importe quel réglage. Une valeur vide efface la ligne, ce qui
 *  revient à retomber sur la valeur par défaut du code. */
export async function saveSetting(key, value) {
  if (value === null || value === undefined || value === "") {
    return supabase.from("settings").delete().eq("key", key);
  }
  return supabase
    .from("settings")
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() });
}

