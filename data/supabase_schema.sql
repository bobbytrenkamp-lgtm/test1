-- US Data Center & AI Policy Tracker — Supabase Database Schema
-- Run this entire file in Supabase Dashboard → SQL Editor → New query
-- All tables have Row Level Security enabled. Never disable RLS.

-- ─────────────────────────────────────────────────────────────────
-- profiles
-- Auto-created for every new user via the trigger below.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Automatically create a profile row for every new Supabase user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────
-- user_preferences
-- One row per (user, key). value is JSONB so any type can be stored.
-- Keys: 'theme', 'aiPolicyTracker.stockFavorites.v1', 'dc-map-bookmarks-v1'
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.user_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);

alter table public.user_preferences enable row level security;

create policy "Users can manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- saved_items
-- Foundation for saved counties, news bookmarks, stock watchlists.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.saved_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('county', 'article', 'stock')),
  item_id    text not null,
  item_data  jsonb,
  notes      text,
  created_at timestamptz not null default now(),
  unique(user_id, type, item_id)
);

alter table public.saved_items enable row level security;

create policy "Users can manage own saved items"
  on public.saved_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
