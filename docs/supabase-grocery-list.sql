-- NoA shared household grocery list.
-- Run this in the Optra Studio Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.noa_grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_owner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  item text not null,
  quantity text not null default '',
  category text not null default 'General',
  added_by text not null default '',
  added_by_user_id uuid null references public.user_profiles(user_id) on delete set null,
  completed boolean not null default false,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.noa_grocery_items enable row level security;

create index if not exists noa_grocery_items_household_idx
  on public.noa_grocery_items (household_owner_user_id, completed, created_at desc);

create index if not exists noa_grocery_items_added_by_idx
  on public.noa_grocery_items (added_by_user_id);

comment on table public.noa_grocery_items is 'Shared household grocery list used by NoA Budget and future home-screen grocery entry pages.';
comment on column public.noa_grocery_items.household_owner_user_id is 'Owner user id for the household list. NoA server routes scope reads and writes to this profile.';
