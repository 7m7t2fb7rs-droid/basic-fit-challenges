-- ============================================================
--  Challenges Basic Fit — schéma Supabase
--  À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Table des défis
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  metric      text not null default 'time' check (metric in ('time','reps')),
  status      text not null default 'upcoming' check (status in ('upcoming','active','finished')),
  end_date    date,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Table des performances (une ligne = un participant sur un défi)
create table if not exists public.entries (
  id               uuid primary key default gen_random_uuid(),
  challenge_id     uuid not null references public.challenges(id) on delete cascade,
  participant_name text not null,
  raw_value        text not null,           -- "2:40" (temps) ou "42" (répétitions)
  created_at       timestamptz not null default now()
);

create index if not exists entries_challenge_idx on public.entries(challenge_id);

-- ------------------------------------------------------------
--  Sécurité (Row Level Security)
--  Lecture publique · écriture réservée aux admins connectés
-- ------------------------------------------------------------
alter table public.challenges enable row level security;
alter table public.entries    enable row level security;

drop policy if exists "read_challenges" on public.challenges;
drop policy if exists "write_challenges" on public.challenges;
drop policy if exists "read_entries" on public.entries;
drop policy if exists "write_entries" on public.entries;

create policy "read_challenges"  on public.challenges for select using (true);
create policy "write_challenges" on public.challenges for all to authenticated using (true) with check (true);

create policy "read_entries"  on public.entries for select using (true);
create policy "write_entries" on public.entries for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
--  Données d'exemple (Défi 1 — Dead Hang). Optionnel.
-- ------------------------------------------------------------
insert into public.challenges (name, description, metric, status, end_date, sort_order)
values ('Dead Hang', 'Suspension à la barre — le record est à battre.', 'time', 'finished', '2026-07-24', 1)
on conflict do nothing;

-- Pour insérer les 9 scores du Défi 1, décommente et exécute après avoir créé le défi :
-- with c as (select id from public.challenges where name = 'Dead Hang' limit 1)
-- insert into public.entries (challenge_id, participant_name, raw_value)
-- select c.id, v.name, v.val from c, (values
--   ('Charly','2:40'),('Lydie','2:38'),('Ayoub_13K3','2:18'),('Laurine','2:07'),
--   ('Robin','2:05'),('Olivier','1:56'),('Okan','1:47'),('Maëlle','1:09'),('Alicia','1:02')
-- ) as v(name,val);
