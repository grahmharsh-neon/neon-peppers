alter table public.products
add column if not exists option_label text;

alter table public.products
add column if not exists option_values text[] not null default '{}';

update public.products
set
  option_label = coalesce(nullif(option_label,''),'Size'),
  option_values = case
    when cardinality(option_values) = 0
      and nullif(trim(strength),'') is not null
    then array[trim(strength)]
    else option_values
  end
where nullif(trim(strength),'') is not null;

notify pgrst,'reload schema';
