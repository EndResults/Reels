-- Add language and logo_url to shops, with safe checks
begin;

alter table public.shops add column if not exists language text not null default 'nl';
alter table public.shops add column if not exists logo_url text null;

-- Optional: constrain language to supported set
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shops_language_chk'
      and conrelid = 'public.shops'::regclass
  ) then
    alter table public.shops
      add constraint shops_language_chk
      check (language in ('nl','en'));
  end if;
end$$;

commit;
