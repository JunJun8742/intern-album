-- บันทึกฝึกงาน: initial schema
-- Tables are prefixed album_ so they can live in a shared Supabase project.

create table if not exists public.album_albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  -- null = private. A random token enables the public share link.
  share_token text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.album_albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz not null default now(),
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists album_photos_album_taken_idx
  on public.album_photos (album_id, taken_at);

alter table public.album_albums enable row level security;
alter table public.album_photos enable row level security;

create policy "owner manages albums" on public.album_albums
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner manages photos" on public.album_photos
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Public share links are served by the server (service role) after the token
-- is validated, so no anonymous read policy is needed on the tables.

-- Private storage bucket; objects are stored under "<owner_id>/<file>".
insert into storage.buckets (id, name, public)
values ('album-photos', 'album-photos', false)
on conflict (id) do nothing;

create policy "owner manages own photo files" on storage.objects
  for all to authenticated
  using (bucket_id = 'album-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'album-photos' and (storage.foldername(name))[1] = auth.uid()::text);
