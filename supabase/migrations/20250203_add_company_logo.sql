-- Add logo_url to companies
alter table public.companies add column if not exists logo_url text;

-- Create public bucket for company logos.
-- If this fails (e.g. storage not enabled), create bucket "company-logos" as public in Dashboard → Storage.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do update set public = true;

-- Allow users to upload/update/read only their company logo (path: company_id/filename)
drop policy if exists "Users can upload company logo" on storage.objects;
create policy "Users can upload company logo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.companies where user_id = auth.uid()
    )
  );

drop policy if exists "Users can update company logo" on storage.objects;
create policy "Users can update company logo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.companies where user_id = auth.uid()
    )
  );

drop policy if exists "Anyone can read company logos (public bucket)" on storage.objects;
create policy "Anyone can read company logos (public bucket)"
  on storage.objects for select to public
  using (bucket_id = 'company-logos');

drop policy if exists "Users can delete own company logo" on storage.objects;
create policy "Users can delete own company logo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.companies where user_id = auth.uid()
    )
  );
