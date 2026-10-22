create policy "media bucket read" on storage.objects for select to authenticated using (bucket_id = 'media');
create policy "media bucket own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media bucket own update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);