alter table public.products
add column if not exists option_label text;

alter table public.products
add column if not exists option_values text[] not null default '{}';

update public.products
set option_label='Size'
where option_label is null or btrim(option_label)='';

-- Convert only the four old default mL values to the corrected mg values.
update public.products
set option_values = array(
  select distinct value
  from unnest(
    array_replace(
      array_replace(
        array_replace(
          array_replace(option_values,'5 mL','5mg'),
          '10 mL','10mg'
        ),
        '20 mL','20mg'
      ),
      '30 mL','30mg'
    )
  ) as value
)
where option_values && array['5 mL','10 mL','20 mL','30 mL'];

notify pgrst,'reload schema';
