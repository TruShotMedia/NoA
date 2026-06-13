-- NoA durable event log.
-- Run this once in the Supabase SQL editor for your project.

create extension if not exists pgcrypto;

create table if not exists public.noa_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null default 'noa',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.noa_events enable row level security;

drop policy if exists "NoA can insert events" on public.noa_events;

create policy "NoA can insert events"
on public.noa_events
for insert
to anon
with check (true);

grant insert on public.noa_events to anon;

create index if not exists noa_events_created_at_idx
on public.noa_events (created_at desc);

create index if not exists noa_events_event_type_idx
on public.noa_events (event_type);
