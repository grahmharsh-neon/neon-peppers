alter table public.site_settings
add column if not exists vial_template_url text;

alter table public.site_settings
add column if not exists vial_label_background text
not null default '#f4f0e8';

alter table public.site_settings
add column if not exists vial_label_text_color text
not null default '#111111';

alter table public.site_settings
add column if not exists vial_label_accent_color text
not null default '#ff2f92';

notify pgrst, 'reload schema';


alter table public.site_settings
add column if not exists vial_template_url text;

update public.site_settings
set vial_template_url = '/assets/neon-peppers-approved-vial-template.png'
where id = 1
  and (
    vial_template_url is null
    or btrim(vial_template_url) = ''
  );

notify pgrst, 'reload schema';
