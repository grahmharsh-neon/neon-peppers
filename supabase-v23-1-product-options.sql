alter table public.products
add column if not exists option_label text;

alter table public.products
add column if not exists option_values text[] not null default '{}';

update public.products
set option_label = 'Size'
where option_label is null or btrim(option_label) = '';

-- Preserve any old single strength value as an option.
update public.products
set option_values = array[trim(strength)]
where cardinality(option_values)=0
  and nullif(trim(strength),'') is not null;

notify pgrst,'reload schema';
