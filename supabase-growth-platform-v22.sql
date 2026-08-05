create extension if not exists pgcrypto;

alter table public.customers
add column if not exists referral_code text;

alter table public.customers
alter column referral_code
set default upper(substr(md5(gen_random_uuid()::text),1,8));

alter table public.customers
add column if not exists referral_credit numeric(12,2) not null default 0;

create unique index if not exists customers_referral_code_unique
on public.customers(referral_code)
where referral_code is not null;

update public.customers
set referral_code = upper(substr(md5(id::text),1,8))
where referral_code is null;

create table if not exists public.coupon_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null default 'percent'
    check(discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null default 0,
  minimum_subtotal numeric(12,2) not null default 0,
  usage_limit integer,
  usage_count integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_customer_id uuid not null
    references public.customers(id) on delete cascade,
  referred_customer_id uuid
    references public.customers(id) on delete set null,
  referred_email text not null,
  referral_code text not null,
  order_request_id uuid
    references public.order_requests(id) on delete set null,
  invoice_id uuid
    references public.invoices(id) on delete set null,
  reward_amount numeric(12,2) not null default 20,
  status text not null default 'pending'
    check(status in ('pending','qualified','rewarded','void')),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);

create unique index if not exists referrals_one_reward_per_email
on public.referrals(lower(referred_email))
where status <> 'void';

create table if not exists public.customer_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null
    references public.customers(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.order_requests
add column if not exists coupon_code text;

alter table public.order_requests
add column if not exists discount_amount numeric(12,2) not null default 0;

alter table public.order_requests
add column if not exists referral_code text;

alter table public.invoices
add column if not exists coupon_code text;

alter table public.invoices
add column if not exists referral_code text;

alter table public.coupon_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.customer_portal_tokens enable row level security;

drop policy if exists "Authenticated admins manage coupons"
on public.coupon_codes;
create policy "Authenticated admins manage coupons"
on public.coupon_codes for all to authenticated
using(true) with check(true);

drop policy if exists "Authenticated admins manage referrals"
on public.referrals;
create policy "Authenticated admins manage referrals"
on public.referrals for all to authenticated
using(true) with check(true);

grant select,insert,update,delete on public.coupon_codes to authenticated;
grant select,insert,update,delete on public.referrals to authenticated;

create or replace function public.reward_referral_on_paid_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referral_row public.referrals%rowtype;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select *
    into referral_row
    from public.referrals
    where invoice_id = new.id
      and status in ('pending','qualified')
    order by created_at asc
    limit 1
    for update;

    if found then
      update public.customers
      set referral_credit = referral_credit + referral_row.reward_amount,
          updated_at = now()
      where id = referral_row.referrer_customer_id;

      update public.referrals
      set status = 'rewarded',
          rewarded_at = now()
      where id = referral_row.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reward_referral_after_invoice_paid
on public.invoices;

create trigger reward_referral_after_invoice_paid
after update of status on public.invoices
for each row
execute function public.reward_referral_on_paid_invoice();

notify pgrst,'reload schema';
