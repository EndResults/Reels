-- Add per-shop FiT widget color customization fields (Enterprise-only feature at app level)
-- Safe, idempotent migration for Supabase (PostgreSQL)

begin;

-- Gradient colors used in modal header and primary areas
alter table public.shops add column if not exists widget_color_gradient_from text null;
comment on column public.shops.widget_color_gradient_from is 'Widget gradient FROM color (maps Tailwind .from-*, e.g. #f91640)';

alter table public.shops add column if not exists widget_color_gradient_to text null;
comment on column public.shops.widget_color_gradient_to is 'Widget gradient TO color (maps Tailwind .to-*, e.g. #0c5dea)';

-- Shadow color for primary button and prominent elements
alter table public.shops add column if not exists widget_color_shadow text null;
comment on column public.shops.widget_color_shadow is 'Widget shadow color (maps Tailwind .shadow-*/30, e.g. #2bf9164d or rgba())';

-- Primary button colors
alter table public.shops add column if not exists widget_color_button_bg text null;
comment on column public.shops.widget_color_button_bg is 'Primary button background color (maps Tailwind .bg-*, e.g. #2c16f9)';

alter table public.shops add column if not exists widget_color_button_border text null;
comment on column public.shops.widget_color_button_border is 'Primary button border color (maps Tailwind .border-*, e.g. #f91647)';

-- Tile/text accents inside the wizard
alter table public.shops add column if not exists widget_color_tile_text text null;
comment on column public.shops.widget_color_tile_text is 'Tile/accent text color (maps Tailwind .text-*, e.g. #7eea0c)';

alter table public.shops add column if not exists widget_color_tile_border text null;
comment on column public.shops.widget_color_tile_border is 'Tile/card border color (maps Tailwind .border-*, e.g. #e2e8f0)';

commit;
