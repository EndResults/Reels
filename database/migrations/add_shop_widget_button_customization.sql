-- Add per-shop FiT button customization fields (Enterprise-only feature at app level)
-- Safe, idempotent migration for Supabase (PostgreSQL)

begin;

alter table public.shops add column if not exists widget_button_color_from text null;
comment on column public.shops.widget_button_color_from is 'Widget button gradient FROM color (e.g. #ff7300 or rgba())';

alter table public.shops add column if not exists widget_button_color_to text null;
comment on column public.shops.widget_button_color_to is 'Widget button gradient TO color (e.g. #ff9b00 or rgba())';

alter table public.shops add column if not exists widget_button_label_color text null;
comment on column public.shops.widget_button_label_color is 'Widget button label/text color (e.g. #ffffff or rgba())';

-- Icon variant to use on the button: 'default' (colored) or 'white'
alter table public.shops add column if not exists widget_button_icon text null;
comment on column public.shops.widget_button_icon is 'Widget button icon variant: default|white';

-- Optional localized labels for the button (keys like nl, en)
alter table public.shops add column if not exists widget_button_labels jsonb null;
comment on column public.shops.widget_button_labels is 'Localized labels for the FiT button, e.g. {"nl":"Probeer met FiT","en":"Try with FiT"} (max 20 chars each)';

commit;
