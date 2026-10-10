-- Public share links.
-- Anonymous visitors never read the tables directly (that would expose every
-- share token). They call these two functions with a token they were given.

create or replace function public.album_shared_view(p_token text)
returns table (
  album_title text,
  photo_id uuid,
  storage_path text,
  caption text,
  taken_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.title, p.id, p.storage_path, p.caption, p.taken_at
  from album_albums a
  join album_photos p on p.album_id = a.id
  where a.share_token = p_token
    and p_token is not null
  order by p.taken_at;
$$;

create or replace function public.album_path_is_shared(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from album_photos p
    join album_albums a on a.id = p.album_id
    where p.storage_path = p_path
      and a.share_token is not null
  );
$$;

revoke all on function public.album_shared_view(text) from public;
revoke all on function public.album_path_is_shared(text) from public;
grant execute on function public.album_shared_view(text) to anon, authenticated;
grant execute on function public.album_path_is_shared(text) to anon, authenticated;

-- Lets a visitor create signed URLs for photos of shared albums only.
create policy "anyone reads shared photo files" on storage.objects
  for select to anon
  using (bucket_id = 'album-photos' and public.album_path_is_shared(name));
