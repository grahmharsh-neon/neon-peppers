create extension if not exists pgcrypto;

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  product text,
  message text not null,
  research_acknowledged boolean not null default false,
  source_url text,
  status text not null default 'new'
    check (status in ('new','replied','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

-- Website visitors do not directly read or write this table.
-- The Netlify Function saves submissions using the server-only service-role key.

drop policy if exists "Authenticated admins manage inquiries"
on public.inquiries;

create policy "Authenticated admins manage inquiries"
on public.inquiries
for all
to authenticated
using (true)
with check (true);

grant select, update, delete on public.inquiries to authenticated;
