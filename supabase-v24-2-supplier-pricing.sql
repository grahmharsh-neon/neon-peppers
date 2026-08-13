create extension if not exists pgcrypto;

create table if not exists public.supplier_pricing (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text,
  supplier_name text,
  supplier_cost numeric(12,2) not null default 0,
  retail_price numeric(12,2) not null default 0,
  quantity integer not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_pricing_product_id_idx
on public.supplier_pricing(product_id);

create index if not exists supplier_pricing_product_name_idx
on public.supplier_pricing(lower(product_name));

alter table public.supplier_pricing enable row level security;

drop policy if exists "Authenticated admins manage supplier pricing"
on public.supplier_pricing;

create policy "Authenticated admins manage supplier pricing"
on public.supplier_pricing
for all
to authenticated
using(true)
with check(true);

grant select,insert,update,delete
on public.supplier_pricing
to authenticated;

notify pgrst,'reload schema';
