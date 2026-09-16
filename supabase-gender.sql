-- ============================================================
--  Genre des participants (H / F) — filtre du classement
--  À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Colonne optionnelle : les scores déjà saisis restent valides (genre vide).
alter table public.entries
  add column if not exists gender text;

-- Seules les valeurs 'H' et 'F' (ou vide) sont acceptées.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'entries_gender_check'
  ) then
    alter table public.entries
      add constraint entries_gender_check check (gender in ('H','F'));
  end if;
end $$;
