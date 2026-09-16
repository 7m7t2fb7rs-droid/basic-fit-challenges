import { supabase } from "@/lib/supabaseClient";

/** Date utilisée tant qu'aucune valeur n'est enregistrée en base. */
export const DEFAULT_COUNTDOWN_END = "2026-09-25";

export const COUNTDOWN_KEY = "countdown_end";

/** "2026-09-25" → Date au 25/09/2026 à 23:59:59 (fin de journée locale). */
/*  Toute valeur illisible retombe sur la date par défaut : mieux vaut un
    compte à rebours faux d'un jour qu'un affichage « NaN ».              */
export function endOfDay(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ""));
  const [y, m, d] = (
    match ? match.slice(1) : DEFAULT_COUNTDOWN_END.split("-")
  ).map(Number);
  return new Date(y, m - 1, d, 23, 59, 59);
}

/** Lit la date de fin (format "YYYY-MM-DD"). Retourne la valeur par défaut si absente. */
export async function fetchCountdownEnd() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", COUNTDOWN_KEY)
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_COUNTDOWN_END;
  return data.value;
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

/** Enregistre la date de fin (format "YYYY-MM-DD"). */
export async function saveCountdownEnd(isoDate) {
  return saveSetting(COUNTDOWN_KEY, isoDate);
}
