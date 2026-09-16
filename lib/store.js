"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { COUNTDOWN_KEY, DEFAULT_COUNTDOWN_END } from "@/lib/settings";
import { HOURS_KEY, OVERRIDE_KEY, parseHours, parseOverride } from "@/lib/gym";

/* ------------------------------------------------------------------ */
/*  Les trois tables et le réglage du compte à rebours servent aux      */
/*  deux pages publiques. On les charge une fois, en parallèle, et on   */
/*  garde le résultat : changer de page n'attend plus le réseau.        */
/* ------------------------------------------------------------------ */

// Au-delà, on réaffiche les données connues puis on rafraîchit derrière.
const STALE_AFTER = 60_000;

let cache = null;
let cachedAt = 0;
let inFlight = null;

async function fetchAll() {
  // Deux pages montées en même temps ne déclenchent qu'un seul appel.
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const [ch, en, pa, se] = await Promise.all([
      supabase.from("challenges").select("*").order("sort_order", { ascending: true }),
      supabase.from("entries").select("*"),
      supabase.from("participants").select("*"),
      // Tous les réglages en une fois : compte à rebours ET horaires de la salle.
      supabase.from("settings").select("key,value"),
    ]);
    const failed = ch.error || en.error || pa.error;
    if (failed) throw failed;
    const settings = {};
    for (const row of se.data || []) settings[row.key] = row.value;
    const data = {
      challenges: ch.data || [],
      entries: en.data || [],
      participants: pa.data || [],
      // Les réglages sont accessoires : absents, on retombe sur les valeurs
      // par défaut plutôt que d'afficher un état indéterminé.
      countdownEnd: settings[COUNTDOWN_KEY] || DEFAULT_COUNTDOWN_END,
      gymHours: parseHours(settings[HOURS_KEY]),
      gymOverride: parseOverride(settings[OVERRIDE_KEY]),
    };
    cache = data;
    cachedAt = Date.now();
    return data;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** À appeler après une écriture admin, pour que les pages publiques
 *  ne resservent pas des données périmées. */
export function invalidateData() {
  cache = null;
  cachedAt = 0;
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [state, setState] = useState({ data: cache, loading: !cache, error: null });
  const mounted = useRef(true);

  const load = useCallback(async ({ background = false } = {}) => {
    if (!background) setState((s) => ({ ...s, loading: !s.data, error: null }));
    try {
      const data = await fetchAll();
      if (mounted.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (!mounted.current) return;
      // En rafraîchissement de fond, on garde l'affichage en place plutôt que
      // de remplacer un classement correct par un message d'erreur.
      setState((s) =>
        background && s.data
          ? s
          : { data: s.data, loading: false, error: err.message || "Erreur de chargement" }
      );
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!cache) load();
    else if (Date.now() - cachedAt > STALE_AFTER) load({ background: true });
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Le provider vit dans le layout : il ne se remonte pas d'une page à
  // l'autre. On revérifie donc la fraîcheur à chaque changement de page,
  // en tâche de fond — l'affichage ne bouge pas, la navigation reste immédiate.
  const pathname = usePathname();
  useEffect(() => {
    if (cache && Date.now() - cachedAt > STALE_AFTER) load({ background: true });
  }, [pathname, load]);

  // Revenir sur l'app après un moment doit montrer l'état réel, pas un
  // classement figé depuis ce matin.
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === "visible" && Date.now() - cachedAt > STALE_AFTER) {
        load({ background: true });
      }
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [load]);

  const refresh = useCallback(() => {
    invalidateData();
    return load();
  }, [load]);

  return (
    <DataContext.Provider value={{ ...state, refresh }}>{children}</DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData doit être utilisé dans <DataProvider>");
  return ctx;
}
