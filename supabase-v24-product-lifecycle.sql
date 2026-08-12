alter table public.products
add column if not exists lifecycle_status text;

update public.products
set lifecycle_status = 'published'
where lifecycle_status is null or btrim(lifecycle_status) = '';

alter table public.products
alter column lifecycle_status set default 'draft';

alter table public.products
alter column lifecycle_status set not null;

alter table public.products
drop constraint if exists products_lifecycle_status_check;

alter table public.products
add constraint products_lifecycle_status_check
check (lifecycle_status in ('draft','inventory','published','archived'));

notify pgrst,'reload schema';
