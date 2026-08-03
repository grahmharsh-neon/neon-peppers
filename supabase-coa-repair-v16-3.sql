create extension if not exists pgcrypto;

create table if not exists public.product_coas (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products(id)
    on delete cascade,
  strength text,
  lot_number text not null,
  batch_number text,
  lab_name text,
  purity_percent numeric(6,3)
    check (
      purity_percent is null
      or (purity_percent >= 0 and purity_percent <= 100)
    ),
  test_date date,
  expiration_date date,
  file_url text,
  file_path text,
  file_type text,
  original_file_name text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_coas_product_lot_unique
on public.product_coas(product_id, lot_number);

alter table public.product_coas enable row level security;

drop policy if exists "Public can view public COAs"
on public.product_coas;

create policy "Public can view public COAs"
on public.product_coas
for select
using (is_public = true);

drop policy if exists "Authenticated admins manage COAs"
on public.product_coas;

create policy "Authenticated admins manage COAs"
on public.product_coas
for all
to authenticated
using (true)
with check (true);

grant select on public.product_coas to anon, authenticated;
grant insert, update, delete on public.product_coas to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-files',
  'product-files',
  true,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product files"
on storage.objects;

create policy "Public can view product files"
on storage.objects
for select
using (bucket_id = 'product-files');

drop policy if exists "Authenticated admins upload product files"
on storage.objects;

create policy "Authenticated admins upload product files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-files');

drop policy if exists "Authenticated admins update product files"
on storage.objects;

create policy "Authenticated admins update product files"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-files')
with check (bucket_id = 'product-files');

drop policy if exists "Authenticated admins delete product files"
on storage.objects;

create policy "Authenticated admins delete product files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-files');

notify pgrst, 'reload schema';
