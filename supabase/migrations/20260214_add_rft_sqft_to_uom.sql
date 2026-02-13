-- Add rft and sqft to UOM
insert into public.uom (code, description)
values
  ('rft', 'Running foot / linear foot'),
  ('sqft', 'Square foot')
on conflict (code) do nothing;
