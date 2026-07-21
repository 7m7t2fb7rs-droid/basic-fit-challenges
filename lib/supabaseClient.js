import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Aide au diagnostic si les variables d'environnement manquent sur Vercel.
  console.warn(
    "⚠️ Variables Supabase manquantes. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url || "", anonKey || "");
