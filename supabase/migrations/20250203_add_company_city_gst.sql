-- Add city and gst_number to companies (run if table already existed before these columns)
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists gst_number text;
