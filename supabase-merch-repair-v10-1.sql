create extension if not exists pgcrypto;

create table if not exists public.merch_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  image_url text,
  base_price numeric(10,2) not null default 0,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merch_variants (
  id uuid primary key default gen_random_uuid(),
  merch_item_id uuid not null
    references public.merch_items(id)
    on delete cascade,
  label text not null default 'Standard',
  size text,
  color text,
  price numeric(10,2) not null default 0,
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

alter table public.merch_items enable row level security;
alter table public.merch_variants enable row level security;

drop policy if exists "Public can view visible merch items"
on public.merch_items;

create policy "Public can view visible merch items"
on public.merch_items
for select
using (visible = true);

drop policy if exists "Public can view visible merch variants"
on public.merch_variants;

create policy "Public can view visible merch variants"
on public.merch_variants
for select
using (visible = true);

drop policy if exists "Authenticated admins manage merch items"
on public.merch_items;

create policy "Authenticated admins manage merch items"
on public.merch_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admins manage merch variants"
on public.merch_variants;

create policy "Authenticated admins manage merch variants"
on public.merch_variants
for all
to authenticated
using (true)
with check (true);

grant select on public.merch_items to anon, authenticated;
grant select on public.merch_variants to anon, authenticated;

grant insert, update, delete
on public.merch_items
to authenticated;

grant insert, update, delete
on public.merch_variants
to authenticated;

notify pgrst, 'reload schema';
