create table if not exists public.noa_private_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.noa_private_settings enable row level security;

drop policy if exists "No browser access to private settings" on public.noa_private_settings;
create policy "No browser access to private settings"
on public.noa_private_settings
for all
using (false)
with check (false);

comment on table public.noa_private_settings is
  'Server-only NoA private settings. Access through Supabase service role key from Vercel functions only.';
