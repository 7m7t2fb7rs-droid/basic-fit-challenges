-- ============================================================
--  Saisons — chaque défi appartient à une saison, et le classement
--  général ne compte que les défis de la saison ouverte.
--  À coller dans Supabase > SQL Editor > New query > Run
--  (après supabase-securite.sql, qui définit is_admin()).
--
--  Clôturer une saison (depuis l'espace équipe) fige son classement
--  final dans final_board : il reste consultable tel quel, même si
--  une fiche participant est supprimée plus tard.
--  Le script peut être relancé sans risque.
-- ============================================================

create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  start_date  date,
  end_date    date,
  status      text not null default 'open' check (status in ('open','closed')),
  -- Classement figé à la clôture : { all: [...], H: [...], F: [...] }
  final_board jsonb,
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);

-- Une seule saison ouverte à la fois.
create unique index if not exists seasons_one_open
  on public.seasons ((status)) where status = 'open';

alter table public.seasons enable row level security;

drop policy if exists "read_seasons"  on public.seasons;
drop policy if exists "write_seasons" on public.seasons;

create policy "read_seasons"  on public.seasons for select using (true);
create policy "write_seasons" on public.seasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Le lien défi -> saison. « restrict » : on ne peut pas supprimer une
-- saison qui contient encore des défis.
alter table public.challenges
  add column if not exists season_id uuid references public.seasons(id) on delete restrict;

create index if not exists challenges_season_idx on public.challenges(season_id);

-- ------------------------------------------------------------
--  Reprise : tous les défis existants forment la Saison 1, qui se
--  termine à la date du compte à rebours déjà réglée.
-- ------------------------------------------------------------
insert into public.seasons (name, start_date, end_date, status)
select
  'Saison 1',
  (select least(min(end_date), min(created_at)::date) from public.challenges),
  coalesce(
    (select value::date from public.settings where key = 'countdown_end'),
    date '2026-12-01'
  ),
  'open'
where not exists (select 1 from public.seasons);

update public.challenges
set season_id = (select id from public.seasons order by created_at limit 1)
where season_id is null;
