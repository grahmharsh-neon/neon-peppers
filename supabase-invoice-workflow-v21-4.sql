create extension if not exists pgcrypto;

create sequence if not exists public.invoice_number_seq start 1001;

create table if not exists public.invoices(
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null default(
    'NP-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.invoice_number_seq')::text,5,'0')
  ),
  order_request_id uuid references public.order_requests(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_company text,
  status text not null default'draft' check(status in('draft','sent','paid','void')),
  due_date date,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  tax_rate numeric(7,4) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  internal_notes text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items(
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  option_text text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.order_requests add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.order_requests add column if not exists invoice_number text;
alter table public.order_requests add column if not exists invoice_total numeric(12,2);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "Authenticated admins manage invoices" on public.invoices;
create policy "Authenticated admins manage invoices"
on public.invoices for all to authenticated using(true) with check(true);

drop policy if exists "Authenticated admins manage invoice items" on public.invoice_items;
create policy "Authenticated admins manage invoice items"
on public.invoice_items for all to authenticated using(true) with check(true);

grant select,insert,update,delete on public.invoices to authenticated;
grant select,insert,update,delete on public.invoice_items to authenticated;
grant usage,select on sequence public.invoice_number_seq to authenticated;

notify pgrst,'reload schema';
