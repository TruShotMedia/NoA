create table if not exists public.noa_app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.noa_app_settings enable row level security;

drop policy if exists "No browser access to app settings" on public.noa_app_settings;
create policy "No browser access to app settings"
on public.noa_app_settings
for all
using (false)
with check (false);

comment on table public.noa_app_settings is
  'Server-managed NoA app settings such as grocery-list screensavers. Access is through Vercel functions with the Supabase service role only.';

comment on column public.noa_app_settings.value is
  'Structured JSON settings payload for a NoA-owned feature.';
