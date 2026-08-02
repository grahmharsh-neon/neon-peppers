create extension if not exists pgcrypto;
create table if not exists public.product_variants(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,strength text not null,stock_status text not null default 'available' check(stock_status in('available','low_stock','out_of_stock','coming_soon')),visible boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.order_requests(id uuid primary key default gen_random_uuid(),name text not null,email text not null,company text,phone text,notes text,source_url text,research_acknowledged boolean not null default false,status text not null default 'new' check(status in('new','contacted','approved','closed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.order_request_items(id uuid primary key default gen_random_uuid(),order_request_id uuid not null references public.order_requests(id) on delete cascade,product_id uuid references public.products(id) on delete set null,variant_id uuid references public.product_variants(id) on delete set null,product_name text not null,strength text,quantity integer not null default 1 check(quantity>0),created_at timestamptz not null default now());
alter table public.product_variants enable row level security;alter table public.order_requests enable row level security;alter table public.order_request_items enable row level security;
drop policy if exists "Public can view visible variants" on public.product_variants;create policy "Public can view visible variants" on public.product_variants for select using(visible=true);
drop policy if exists "Authenticated admins manage variants" on public.product_variants;create policy "Authenticated admins manage variants" on public.product_variants for all to authenticated using(true) with check(true);
drop policy if exists "Authenticated admins manage order requests" on public.order_requests;create policy "Authenticated admins manage order requests" on public.order_requests for all to authenticated using(true) with check(true);
drop policy if exists "Authenticated admins manage order request items" on public.order_request_items;create policy "Authenticated admins manage order request items" on public.order_request_items for all to authenticated using(true) with check(true);
grant select on public.product_variants to anon,authenticated;grant insert,update,delete on public.product_variants to authenticated;grant select,update,delete on public.order_requests to authenticated;grant select,update,delete on public.order_request_items to authenticated;
insert into public.products(name,category,description,strength,visible,featured,status,updated_at)
select s.name,s.category,s.description,'',true,false,'available',now()
from(values
('Retatrutide','Metabolic Research','Research material listed for qualified metabolic and receptor-signaling studies.'),
('Tirzepatide','Metabolic Research','Research material listed for qualified metabolic and receptor-signaling studies.'),
('Semaglutide','Metabolic Research','Research material listed for qualified metabolic and receptor-signaling studies.'),
('Cagrilintide','Metabolic Research','Research material listed for qualified metabolic pathway research.'),
('Tesamorelin','Endocrine Research','Research material listed for qualified endocrine pathway studies.'),
('BPC-157','Peptide Research','Research material listed for laboratory peptide studies.'),
('TB-500','Peptide Research','Research material listed for laboratory peptide studies.'),
('BPC-157 + TB-500','Peptide Research','Combined research material listing for laboratory use.'),
('KPV','Peptide Research','Research material listed for laboratory peptide studies.'),
('GHK-Cu','Cellular Research','Copper-peptide research material for qualified laboratory studies.'),
('CJC-1295','Endocrine Research','Research material listed for qualified endocrine pathway studies.'),
('Ipamorelin','Endocrine Research','Research material listed for qualified endocrine pathway studies.'),
('MOTS-c','Cellular Research','Research material listed for qualified cellular and metabolic studies.'),
('IGF-1 LR3','Endocrine Research','Research material listed for qualified laboratory research only.'),
('AOD-9604','Peptide Research','Research material listed for qualified laboratory peptide studies.'),
('Pinealon','Peptide Research','Research material listed for qualified laboratory peptide studies.')
)as s(name,category,description)
where not exists(select 1 from public.products p where lower(p.name)=lower(s.name));
insert into public.product_variants(product_id,strength,stock_status,visible,sort_order)
select p.id,case when nullif(trim(p.strength),'') is null then 'Add strength in Admin' else p.strength end,case when p.status='out_of_stock' then 'out_of_stock' when p.status='coming_soon' then 'coming_soon' else 'available' end,true,0
from public.products p where not exists(select 1 from public.product_variants v where v.product_id=p.id);
notify pgrst,'reload schema';