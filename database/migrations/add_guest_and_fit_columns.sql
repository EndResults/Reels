-- Safe migration to enable guest sessions and per-shop quotas
-- This file adds only missing columns and indexes; it does NOT drop or recreate tables.

-- Ensure pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- USERS: add guest-related columns
alter table public.users
  add column if not exists is_guest boolean not null default false,
  add column if not exists device_id text,
  add column if not exists ip_address text,
  add column if not exists max_sessions integer;

-- Provide a sensible default for max_sessions (server still handles null safely)
alter table public.users
  alter column max_sessions set default 3;

-- Add auth_id column to link registered users to Supabase Auth (when present)
alter table public.users
  add column if not exists auth_id uuid;

-- Only set a default on users.id if there is NO foreign key to auth.users(id)
do $$
declare
  fk_count integer;
begin
  select count(*) into fk_count
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
  join information_schema.constraint_column_usage ccu on rc.unique_constraint_name = ccu.constraint_name and rc.unique_constraint_schema = ccu.constraint_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name = 'users'
    and kcu.column_name = 'id'
    and ccu.table_name = 'users'
    and ccu.table_schema = 'auth';

  if fk_count = 0 then
    -- No FK to auth.users(id) detected; safe to set a default for guest rows
    begin
      alter table public.users alter column id set default gen_random_uuid();
    exception when others then
      -- ignore if cannot alter (e.g., permissions or existing default)
      null;
    end;
  end if;
end $$;

-- helpful indexes for guest lookups and quotas
create index if not exists users_is_guest_idx on public.users(is_guest);
create index if not exists users_device_guest_idx on public.users(device_id) where is_guest = true;
create index if not exists users_auth_id_idx on public.users(auth_id);

-- FIT_SESSIONS: add columns used by widget try-on flow and consumer features
alter table public.fit_sessions
  add column if not exists shop_id uuid references public.shops(id) on delete set null,
  add column if not exists active boolean not null default true,
  add column if not exists satisfied boolean,
  add column if not exists feedback text;

-- Indexes to speed up per-user/per-shop daily limits and listing
create index if not exists fit_sessions_user_shop_day_idx on public.fit_sessions(user_id, shop_id, created_at);
create index if not exists fit_sessions_active_idx on public.fit_sessions(active);
