-- YEXX accounts + pre-order registration schema.
--
-- Run once, in the Supabase SQL Editor (Dashboard > SQL Editor > New query),
-- against a fresh or existing project. Safe to re-run: every object is
-- created with IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS, so
-- re-running this after a partial failure won't error out on "already
-- exists". Order matters — run the whole file in one go rather than
-- statement-by-statement.

-- gen_random_uuid() lives in pgcrypto — enabled by default on every
-- Supabase project, but declared explicitly so this file doesn't depend
-- on that default silently.
create extension if not exists pgcrypto;

-- =====================================================================
-- profiles
-- =====================================================================
-- One row per auth user, created automatically by the trigger below.
-- Deliberately holds only what the brief asks for — no address, no date
-- of birth. Deleting the auth.users row cascades here automatically.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  city text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy for regular users on purpose: rows are created
-- only by the trigger below (which runs as the table owner, bypassing
-- RLS) and removed only via the auth.users cascade — a user should never
-- be able to create a profile for an id that isn't their own, or one with
-- no matching auth.users row at all.

-- =====================================================================
-- preorders
-- =====================================================================
-- `consent_at` isn't in the brief's column list but is required by the
-- brief's own consent requirement ("store the timestamp of that
-- consent") — there's nowhere else to put it.
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  size text not null check (size in ('150ml', '250ml')),
  quantity int not null default 1 check (quantity > 0 and quantity <= 20),
  notes text,
  status text not null default 'registered',
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists preorders_user_id_idx on public.preorders (user_id);

alter table public.preorders enable row level security;

drop policy if exists "preorders_select_own" on public.preorders;
create policy "preorders_select_own"
  on public.preorders for select
  using (auth.uid() = user_id);

drop policy if exists "preorders_insert_own" on public.preorders;
create policy "preorders_insert_own"
  on public.preorders for insert
  with check (auth.uid() = user_id);

drop policy if exists "preorders_delete_own" on public.preorders;
create policy "preorders_delete_own"
  on public.preorders for delete
  using (auth.uid() = user_id);

-- No update policy: cancelling a pre-order is a delete (see the RLS test
-- script and /account's cancel button), not a status change. Only a
-- service-role/admin context could change `status` later (e.g. marking
-- one "confirmed" once shipping is real) — that's future work, not part
-- of this brief.

-- =====================================================================
-- Auto-create a profile row on signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
