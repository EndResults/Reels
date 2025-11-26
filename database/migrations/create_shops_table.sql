-- Create shops table to support multi-shop management per retailer
-- Safe to run multiple times

-- Enable required extensions (Supabase usually has pgcrypto enabled)
create extension if not exists pgcrypto;

-- Create shops table
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  name text not null,
  category text not null,
  domains jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  api_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns safely if the table already exists
alter table public.shops
  add column if not exists domains jsonb not null default '[]'::jsonb;

alter table public.shops
  add column if not exists is_active boolean not null default true;

alter table public.shops
  add column if not exists api_key text;

-- Ensure api_key is unique if the column existed without constraint
create unique index if not exists shops_api_key_key on public.shops(api_key);

-- Helpful indexes
create index if not exists shops_retailer_id_idx on public.shops(retailer_id);
create index if not exists shops_created_at_idx on public.shops(created_at);
