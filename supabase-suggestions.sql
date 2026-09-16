-- ============================================================
--  Suggestions de défis — proposées anonymement par les membres
--  À coller dans Supabase > SQL Editor > New query > Run
--
--  Particularité : c'est la seule table où le public ÉCRIT.
--  Il ne peut en revanche rien y lire — les propositions ne sont
--  visibles que dans l'espace admin.
-- ============================================================

create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  -- Aucun nom, aucune adresse IP : la proposition est anonyme.
  title      text not null check (char_length(btrim(title)) between 3 and 120),
  details    text check (details is null or char_length(details) <= 1000),
  status     text not null default 'new' check (status in ('new','kept','declined')),
  created_at timestamptz not null default now()
);

create index if not exists suggestions_status_idx
  on public.suggestions(status, created_at desc);

alter table public.suggestions enable row level security;

drop policy if exists "insert_suggestions" on public.suggestions;
drop policy if exists "read_suggestions"   on public.suggestions;
drop policy if exists "update_suggestions" on public.suggestions;
drop policy if exists "delete_suggestions" on public.suggestions;

-- Écriture ouverte : n'importe quel visiteur peut déposer une idée.
create policy "insert_suggestions" on public.suggestions
  for insert to anon, authenticated with check (true);

-- Lecture, tri et suppression : réservés aux admins connectés.
create policy "read_suggestions"   on public.suggestions
  for select to authenticated using (true);
create policy "update_suggestions" on public.suggestions
  for update to authenticated using (true) with check (true);
create policy "delete_suggestions" on public.suggestions
  for delete to authenticated using (true);
