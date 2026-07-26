-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Rooms Table
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- Texts Table
create table public.texts (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Files Table (Metadata for files in storage)
create table public.files (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  size bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.texts enable row level security;
alter table public.files enable row level security;

-- Policies for rooms
create policy "Anyone can insert a room"
  on public.rooms for insert
  with check (true);

create policy "Anyone can select a room"
  on public.rooms for select
  using (true);
  
create policy "Anyone can update a room"
  on public.rooms for update
  using (true);

create policy "Anyone can delete a room"
  on public.rooms for delete
  using (true);

-- Policies for texts (controlled by room password via app logic)
create policy "Anyone can insert text"
  on public.texts for insert
  with check (true);

create policy "Anyone can view texts"
  on public.texts for select
  using (true);

-- Policies for files (controlled by room password via app logic)
create policy "Anyone can insert file metadata"
  on public.files for insert
  with check (true);

create policy "Anyone can view file metadata"
  on public.files for select
  using (true);

-- Note: We are allowing open access on the database level for simplicity in this ephemeral app, 
-- but the App/API layer will strictly enforce the password check before querying or returning data.
-- If you want strict DB-level security, you would need to pass the password to Supabase RPCs.

-- Create a storage bucket called 'filedrop'
insert into storage.buckets (id, name, public) 
values ('filedrop', 'filedrop', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Anyone can upload files"
  on storage.objects for insert
  with check ( bucket_id = 'filedrop' );

create policy "Anyone can view files"
  on storage.objects for select
  using ( bucket_id = 'filedrop' );

create policy "Anyone can delete files"
  on storage.objects for delete
  using ( bucket_id = 'filedrop' );
