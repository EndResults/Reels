-- Move promo & branding settings to shop level
-- Safe, idempotent-style migration for Supabase (PostgreSQL)

begin;

-- 1) Add columns on public.shops
alter table public.shops add column if not exists branding_hide_logo boolean not null default false;
alter table public.shops add column if not exists promo_enabled boolean not null default true;
alter table public.shops add column if not exists promo_start_date timestamptz null;
alter table public.shops add column if not exists promo_end_date timestamptz null;

comment on column public.shops.branding_hide_logo is 'Verberg BrendR/FiT-logo in widget (per shop).';
comment on column public.shops.promo_enabled is 'Promo banner aan/uit (per shop).';
comment on column public.shops.promo_start_date is 'Start van promo banner (optioneel gepland).';
comment on column public.shops.promo_end_date is 'Einde van promo banner (optioneel gepland).';

-- 2) Constraint: end > start (when both present)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shops_promo_date_chk'
      and conrelid = 'public.shops'::regclass
  ) then
    alter table public.shops
      add constraint shops_promo_date_chk
      check (
        promo_start_date is null
        or promo_end_date is null
        or promo_end_date > promo_start_date
      );
  end if;
end$$;

-- 3) Data migration: copy retailer-level values to shops (best-effort)
do $$
begin
  -- Branding
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='retailers' and column_name='branding_hide_logo'
  ) then
    update public.shops s
    set branding_hide_logo = coalesce(r.branding_hide_logo, false)
    from public.retailers r
    where s.retailer_id = r.id
      and (s.branding_hide_logo is distinct from coalesce(r.branding_hide_logo, false));
  end if;

  -- Promo
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='retailers' and column_name='promo_enabled'
  ) then
    update public.shops s
    set
      promo_enabled = coalesce(r.promo_enabled, true),
      promo_start_date = r.promo_start_date,
      promo_end_date   = case
                           when r.promo_start_date is not null
                             and r.promo_end_date is not null
                             and r.promo_end_date <= r.promo_start_date
                           then null
                           else r.promo_end_date
                         end
    from public.retailers r
    where s.retailer_id = r.id
      and (
        s.promo_enabled       is distinct from coalesce(r.promo_enabled, true)
        or s.promo_start_date is distinct from r.promo_start_date
        or s.promo_end_date   is distinct from r.promo_end_date
      );
  end if;
end$$;

-- 4) Indexes for efficient queries
create index if not exists idx_shops_promo_enabled on public.shops(promo_enabled);
create index if not exists idx_shops_promo_active_dates
  on public.shops (promo_start_date, promo_end_date)
  where promo_enabled is true;

commit;
