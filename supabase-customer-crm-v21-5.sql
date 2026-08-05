create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  company text,
  status text not null default 'new'
    check(status in('new','active','vip','inactive')),
  notes text,
  first_request_at timestamptz,
  last_request_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "Authenticated admins manage customers"
on public.customers;

create policy "Authenticated admins manage customers"
on public.customers
for all
to authenticated
using(true)
with check(true);

grant select,insert,update,delete
on public.customers
to authenticated;

insert into public.customers(
  name,
  email,
  phone,
  company,
  status,
  first_request_at,
  last_request_at
)
select
  coalesce(nullif(trim(name),''),'Customer'),
  lower(trim(email)),
  max(phone),
  max(company),
  case
    when count(*) >= 3 then 'active'
    else 'new'
  end,
  min(created_at),
  max(created_at)
from public.order_requests
where email is not null
  and trim(email) <> ''
group by lower(trim(email)), name
on conflict(email) do update
set
  name=excluded.name,
  phone=coalesce(excluded.phone,public.customers.phone),
  company=coalesce(excluded.company,public.customers.company),
  first_request_at=least(public.customers.first_request_at,excluded.first_request_at),
  last_request_at=greatest(public.customers.last_request_at,excluded.last_request_at),
  updated_at=now();

notify pgrst,'reload schema';
