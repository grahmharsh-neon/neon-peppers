create table if not exists public.site_settings (
  id integer primary key default 1,
  hero_eyebrow text,
  hero_title text,
  hero_text text,
  primary_button_text text,
  secondary_button_text text,
  hero_image_url text,
  research_banner_title text,
  research_banner_text text,
  research_banner_button text,
  announcement_text text,
  announcement_visible boolean default false,
  contact_email text,
  footer_disclaimer text,
  logo_url text,
  updated_at timestamptz default now()
);

alter table public.site_settings
  add column if not exists primary_button_text text,
  add column if not exists secondary_button_text text,
  add column if not exists research_banner_title text,
  add column if not exists research_banner_text text,
  add column if not exists research_banner_button text,
  add column if not exists announcement_text text,
  add column if not exists announcement_visible boolean default false,
  add column if not exists footer_disclaimer text;

alter table public.site_settings enable row level security;

drop policy if exists "Public can view site settings" on public.site_settings;
create policy "Public can view site settings"
on public.site_settings
for select
using (true);

drop policy if exists "Authenticated users manage site settings" on public.site_settings;
create policy "Authenticated users manage site settings"
on public.site_settings
for all
to authenticated
using (true)
with check (true);

alter table public.products
  add column if not exists featured boolean default false,
  add column if not exists status text default 'available',
  add column if not exists updated_at timestamptz default now();

alter table public.products enable row level security;

drop policy if exists "Public can view visible products" on public.products;
create policy "Public can view visible products"
on public.products
for select
using (visible = true);

drop policy if exists "Authenticated users can manage products" on public.products;
create policy "Authenticated users can manage products"
on public.products
for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id,name,public)
values ('product-images','product-images',true)
on conflict (id) do update set public=true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
using (bucket_id='product-images');

drop policy if exists "Authenticated users upload product images" on storage.objects;
create policy "Authenticated users upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id='product-images');

drop policy if exists "Authenticated users update product images" on storage.objects;
create policy "Authenticated users update product images"
on storage.objects
for update
to authenticated
using (bucket_id='product-images')
with check (bucket_id='product-images');

drop policy if exists "Authenticated users delete product images" on storage.objects;
create policy "Authenticated users delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id='product-images');
