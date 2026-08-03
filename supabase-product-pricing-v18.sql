alter table public.products
add column if not exists price numeric(10,2) not null default 0;

alter table public.products
add column if not exists compare_at_price numeric(10,2);

alter table public.products
add column if not exists price_note text;

notify pgrst, 'reload schema';
