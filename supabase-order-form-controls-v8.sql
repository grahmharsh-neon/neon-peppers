create extension if not exists pgcrypto;

create table if not exists public.order_form_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  image_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_form_item_variants (
  id uuid primary key default gen_random_uuid(),
  order_form_item_id uuid not null
    references public.order_form_items(id)
    on delete cascade,
  strength text not null,
  stock_status text not null default 'available'
    check (
      stock_status in (
        'available',
        'low_stock',
        'out_of_stock',
        'coming_soon'
      )
    ),
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_form_items enable row level security;
alter table public.order_form_item_variants enable row level security;

drop policy if exists "Public can view visible order form items"
on public.order_form_items;

create policy "Public can view visible order form items"
on public.order_form_items
for select
using (visible = true);

drop policy if exists "Public can view visible order form item variants"
on public.order_form_item_variants;

create policy "Public can view visible order form item variants"
on public.order_form_item_variants
for select
using (visible = true);

drop policy if exists "Authenticated admins manage order form items"
on public.order_form_items;

create policy "Authenticated admins manage order form items"
on public.order_form_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admins manage order form item variants"
on public.order_form_item_variants;

create policy "Authenticated admins manage order form item variants"
on public.order_form_item_variants
for all
to authenticated
using (true)
with check (true);

grant select on public.order_form_items to anon, authenticated;
grant select on public.order_form_item_variants to anon, authenticated;

grant insert, update, delete
on public.order_form_items
to authenticated;

grant insert, update, delete
on public.order_form_item_variants
to authenticated;

alter table public.order_request_items
add column if not exists order_form_item_id uuid
references public.order_form_items(id)
on delete set null;

notify pgrst, 'reload schema';
