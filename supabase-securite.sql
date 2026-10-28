-- ============================================================
--  Renforcement de la sécurité — à exécuter UNE fois, APRÈS avoir
--  déployé le site qui l'accompagne (sinon les pages publiques, qui
--  lisaient encore toutes les colonnes, afficheraient une erreur).
--  À coller dans Supabase > SQL Editor > New query > Run
--
--  1. Seuls les comptes listés dans « admins » peuvent écrire.
--     Avant : tout compte connecté était admin — il suffisait que
--     l'inscription soit rouverte par erreur pour ouvrir la base.
--  2. Un participant ne peut avoir qu'un score par défi.
--  3. Le public ne lit plus « verified_by » ni l'ancien nom en texte.
--  4. Les propositions anonymes sont limitées en volume (anti-spam).
--  Le script peut être relancé sans risque.
-- ============================================================

-- ------------------------------------------------------------
--  1. Liste des admins
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Personne ne lit ni n'écrit cette table depuis le site : on la gère
-- uniquement ici, dans le SQL Editor.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- Les comptes existants sont tous des admins (l'inscription est fermée,
-- ils ont été créés à la main) : on les reprend tels quels.
insert into public.admins (user_id)
select id from auth.users
on conflict do nothing;

-- Pour ajouter un admin plus tard : créer le compte dans
-- Authentication > Users, puis exécuter :
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'prenom@exemple.fr';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Écritures réservées aux admins (la lecture publique ne change pas).
drop policy if exists "write_challenges"   on public.challenges;
drop policy if exists "write_entries"      on public.entries;
drop policy if exists "write_participants" on public.participants;
drop policy if exists "write_settings"     on public.settings;

create policy "write_challenges"   on public.challenges   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "write_entries"      on public.entries      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "write_participants" on public.participants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "write_settings"     on public.settings     for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read_suggestions"   on public.suggestions;
drop policy if exists "update_suggestions" on public.suggestions;
drop policy if exists "delete_suggestions" on public.suggestions;

create policy "read_suggestions"   on public.suggestions for select to authenticated using (public.is_admin());
create policy "update_suggestions" on public.suggestions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete_suggestions" on public.suggestions for delete to authenticated using (public.is_admin());

-- ------------------------------------------------------------
--  2. Un seul score par personne et par défi
--     (vérifié le 28/10/2026 : aucun doublon dans la base)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'entries_one_per_challenge'
  ) then
    alter table public.entries
      add constraint entries_one_per_challenge unique (challenge_id, participant_id);
  end if;
end $$;

-- ------------------------------------------------------------
--  3. Colonnes visibles du public sur les scores
-- ------------------------------------------------------------
revoke select on public.entries from anon;
grant select (id, challenge_id, participant_id, raw_value, created_at)
  on public.entries to anon;

-- ------------------------------------------------------------
--  4. Anti-spam des propositions
--     Aucune donnée sur l'auteur n'est gardée : la limite est donc
--     globale — 20 propositions par tranche de 10 minutes, et pas plus
--     de 300 en attente de tri.
-- ------------------------------------------------------------
create or replace function public.limit_suggestions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.suggestions
      where created_at > now() - interval '10 minutes') >= 20
     or (select count(*) from public.suggestions where status = 'new') >= 300 then
    raise exception 'suggestions_rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists suggestions_rate_limit on public.suggestions;
create trigger suggestions_rate_limit
  before insert on public.suggestions
  for each row execute function public.limit_suggestions();

-- ------------------------------------------------------------
--  5. Ménage : espaces parasites dans les noms de défis
-- ------------------------------------------------------------
update public.challenges set name = btrim(name) where name <> btrim(name);
