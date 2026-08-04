create extension if not exists pgcrypto;

alter table public.products add column if not exists slug text;
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists stock_count integer not null default 0;
alter table public.products add column if not exists low_stock_threshold integer not null default 5;
alter table public.products add column if not exists internal_notes text;
alter table public.products add column if not exists supplier text;
alter table public.products add column if not exists unit_cost numeric(10,2);
alter table public.products add column if not exists shelf_location text;
alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.products add column if not exists related_product_ids uuid[] not null default '{}';

create unique index if not exists products_slug_unique
on public.products(slug) where slug is not null;

create table if not exists public.product_events(
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  event_type text not null check(event_type in('view','search','order_request')),
  search_term text,
  source_url text,
  created_at timestamptz not null default now()
);

alter table public.product_events enable row level security;

drop policy if exists "Public can insert product events" on public.product_events;
create policy "Public can insert product events"
on public.product_events for insert to anon,authenticated with check(true);

drop policy if exists "Authenticated admins view product events" on public.product_events;
create policy "Authenticated admins view product events"
on public.product_events for select to authenticated using(true);

grant insert on public.product_events to anon,authenticated;
grant select on public.product_events to authenticated;

update public.products
set slug=regexp_replace(regexp_replace(lower(name),'[^a-z0-9]+','-','g'),'(^-|-$)','','g')
where slug is null or btrim(slug)='';

notify pgrst,'reload schema';


-- Aliases are no longer used by the website.
-- An existing aliases column may remain safely; it is optional and ignored.

notify pgrst,'reload schema';


-- hide_when_out_of_stock is no longer used by the website.
-- If the column already exists, it may remain safely and will be ignored.

notify pgrst,'reload schema';
