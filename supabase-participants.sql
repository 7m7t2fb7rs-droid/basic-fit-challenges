-- ============================================================
--  Fiches participants — une personne = une fiche unique
--  À coller dans Supabase > SQL Editor > New query > Run
--
--  Avant : le nom était recopié en texte sur chaque score, donc deux
--  personnes portant le même prénom étaient fusionnées au classement.
--  Après : chaque score pointe vers une fiche. Deux « Sarah » sont deux
--  fiches distinctes, quel que soit leur nom.
-- ============================================================

-- ------------------------------------------------------------
--  1. La table des personnes
-- ------------------------------------------------------------
create table if not exists public.participants (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text,                    -- optionnel : sert à distinguer les homonymes
  gender     text check (gender in ('H','F')),
  created_at timestamptz not null default now()
);

alter table public.participants enable row level security;

drop policy if exists "read_participants"  on public.participants;
drop policy if exists "write_participants" on public.participants;

create policy "read_participants"  on public.participants for select using (true);
create policy "write_participants" on public.participants for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
--  2. Le lien score -> personne
-- ------------------------------------------------------------
alter table public.entries
  add column if not exists participant_id uuid references public.participants(id) on delete cascade;

create index if not exists entries_participant_idx on public.entries(participant_id);

-- ------------------------------------------------------------
--  3. Reprise des scores déjà saisis
--     Une fiche par nom distinct, casse et espaces ignorés :
--     « Ayoub_13K3 » et « Ayoub_13k3 » donnent bien UNE seule fiche.
-- ------------------------------------------------------------
insert into public.participants (first_name)
select distinct on (lower(btrim(participant_name))) btrim(participant_name)
from public.entries
where participant_id is null
  and participant_name is not null
order by lower(btrim(participant_name)), created_at;

update public.entries e
set participant_id = p.id
from public.participants p
where e.participant_id is null
  and p.last_name is null
  and lower(btrim(e.participant_name)) = lower(btrim(p.first_name));

-- ------------------------------------------------------------
--  4. Verrouillage une fois tout le monde rattaché
--     (ne s'applique que s'il ne reste aucun score orphelin)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.entries where participant_id is null) then
    alter table public.entries alter column participant_id set not null;
  end if;
end $$;

-- Le nom en texte devient un simple historique : plus personne ne l'écrit,
-- il reste consultable pour vérifier la reprise ci-dessus.
alter table public.entries alter column participant_name drop not null;

-- Le genre est désormais porté par la personne, plus par le score.
alter table public.entries drop column if exists gender;
