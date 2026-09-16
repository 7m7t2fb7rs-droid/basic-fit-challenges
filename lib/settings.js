import { supabase } from "@/lib/supabaseClient";

/** Date utilisée tant qu'aucune valeur n'est enregistrée en base. */
export const DEFAULT_COUNTDOWN_END = "2026-09-25";

export const COUNTDOWN_KEY = "countdown_end";

/** "2026-09-25" → Date au 25/09/2026 à 23:59:59 (fin de journée locale). */
export function endOfDay(isoDate) {
  const [y, m, d] = (isoDate || DEFAULT_COUNTDOWN_END).split("-").map(Number);
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

/** Enregistre la date de fin (format "YYYY-MM-DD"). */
export async function saveCountdownEnd(isoDate) {
  return supabase
    .from("settings")
    .upsert({ key: COUNTDOWN_KEY, value: isoDate, updated_at: new Date().toISOString() });
}
