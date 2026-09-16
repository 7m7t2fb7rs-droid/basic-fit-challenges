-- ============================================================
--  Réglages généraux (dont la date de fin du compte à rebours)
--  À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "read_settings"  on public.settings;
drop policy if exists "write_settings" on public.settings;

create policy "read_settings"  on public.settings for select using (true);
create policy "write_settings" on public.settings for all to authenticated using (true) with check (true);

-- Valeur par défaut : date de fin actuelle du classement
insert into public.settings (key, value)
values ('countdown_end', '2026-09-25')
on conflict (key) do nothing;
