alter table public.products
add column if not exists option_label text;

update public.products
set option_label = 'Size'
where option_label is null or btrim(option_label) = '';

notify pgrst, 'reload schema';
