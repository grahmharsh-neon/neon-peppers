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
grant insert, update, delete on public.order_form_items to authenticated;
grant insert, update, delete on public.order_form_item_variants to authenticated;

-- Curated peptide list
with seed(name, category, description, sort_order) as (
  values
    ('Retatrutide','Metabolic Research','Research material commonly requested for metabolic and receptor-signaling studies.',1),
    ('Tirzepatide','Metabolic Research','Research material commonly requested for metabolic and receptor-signaling studies.',2),
    ('Semaglutide','Metabolic Research','Research material commonly requested for metabolic pathway studies.',3),
    ('Cagrilintide','Metabolic Research','Research material commonly requested for metabolic pathway research.',4),
    ('Tesamorelin','Growth Hormone Research','Research material commonly requested for endocrine and growth hormone pathway studies.',5),
    ('Ipamorelin','Growth Hormone Research','Research material commonly requested for endocrine and growth hormone pathway studies.',6),
    ('CJC-1295 No DAC','Growth Hormone Research','Research material commonly requested for endocrine pathway studies.',7),
    ('CJC-1295 DAC','Growth Hormone Research','Research material commonly requested for endocrine pathway studies.',8),
    ('BPC-157','Recovery Research','Research material commonly requested for laboratory recovery and tissue-response studies.',9),
    ('BPC-157 + TB-500','Recovery Research','Combined research material commonly requested for laboratory recovery studies.',10),
    ('TB-500','Recovery Research','Research material commonly requested for laboratory recovery studies.',11),
    ('KPV','Recovery Research','Research material commonly requested for peptide and inflammatory-signaling studies.',12),
    ('GHK-Cu','Recovery Research','Copper-peptide research material commonly requested for cellular studies.',13),
    ('MOTS-c','Longevity Research','Research material commonly requested for cellular and metabolic studies.',14),
    ('SS-31','Longevity Research','Research material commonly requested for mitochondrial research.',15),
    ('Epitalon','Longevity Research','Research material commonly requested for longevity-related laboratory studies.',16),
    ('Thymosin Alpha-1','Longevity Research','Research material commonly requested for immune-signaling studies.',17),
    ('NAD+','Longevity Research','Research material commonly requested for cellular-energy research.',18),
    ('BAC Water','Support','Sterile bacteriostatic water listed as a support item.',19)
)
insert into public.order_form_items
  (name, category, description, visible, sort_order)
select
  seed.name,
  seed.category,
  seed.description,
  true,
  seed.sort_order
from seed
where not exists (
  select 1
  from public.order_form_items current
  where lower(current.name) = lower(seed.name)
);

-- Strength presets
with strength_seed(product_name, strength, stock_status, sort_order) as (
  values
    ('Retatrutide','5 mg','available',1),
    ('Retatrutide','10 mg','available',2),
    ('Retatrutide','15 mg','available',3),

    ('Tirzepatide','5 mg','available',1),
    ('Tirzepatide','10 mg','available',2),
    ('Tirzepatide','15 mg','available',3),

    ('Semaglutide','5 mg','available',1),
    ('Semaglutide','10 mg','available',2),

    ('Cagrilintide','5 mg','available',1),
    ('Cagrilintide','10 mg','available',2),

    ('Tesamorelin','5 mg','available',1),
    ('Tesamorelin','10 mg','available',2),

    ('Ipamorelin','5 mg','available',1),
    ('Ipamorelin','10 mg','available',2),

    ('CJC-1295 No DAC','5 mg','available',1),
    ('CJC-1295 No DAC','10 mg','available',2),

    ('CJC-1295 DAC','5 mg','available',1),
    ('CJC-1295 DAC','10 mg','available',2),

    ('BPC-157','5 mg','available',1),
    ('BPC-157','10 mg','available',2),

    ('BPC-157 + TB-500','5 mg / 5 mg','available',1),
    ('BPC-157 + TB-500','10 mg / 10 mg','available',2),

    ('TB-500','5 mg','available',1),
    ('TB-500','10 mg','available',2),

    ('KPV','5 mg','available',1),
    ('KPV','10 mg','available',2),

    ('GHK-Cu','50 mg','available',1),
    ('GHK-Cu','100 mg','available',2),

    ('MOTS-c','10 mg','available',1),
    ('MOTS-c','20 mg','available',2),

    ('SS-31','10 mg','available',1),
    ('SS-31','20 mg','available',2),

    ('Epitalon','10 mg','available',1),
    ('Epitalon','20 mg','available',2),

    ('Thymosin Alpha-1','5 mg','available',1),
    ('Thymosin Alpha-1','10 mg','available',2),

    ('NAD+','500 mg','available',1),
    ('NAD+','1000 mg','available',2),

    ('BAC Water','10 mL','available',1),
    ('BAC Water','30 mL','available',2)
)
insert into public.order_form_item_variants
  (order_form_item_id, strength, stock_status, visible, sort_order)
select
  item.id,
  seed.strength,
  seed.stock_status,
  true,
  seed.sort_order
from strength_seed seed
join public.order_form_items item
  on lower(item.name) = lower(seed.product_name)
where not exists (
  select 1
  from public.order_form_item_variants existing
  where existing.order_form_item_id = item.id
    and lower(existing.strength) = lower(seed.strength)
);

notify pgrst, 'reload schema';
