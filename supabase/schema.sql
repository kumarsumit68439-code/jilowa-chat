-- Run this in the SAME Supabase project as AI Gateway Hub
-- SQL Editor → New query → Run

-- Servers (like Discord guilds)
create table if not exists public.chat_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '💬',
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Channels inside a server
create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.chat_servers(id) on delete cascade,
  name text not null,
  topic text default '',
  is_ai boolean default false, -- AI channel: messages go to Gateway
  created_at timestamptz default now()
);

-- Messages (realtime)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.chat_channels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_avatar text,
  content text not null,
  is_ai boolean default false,
  created_at timestamptz default now()
);

-- Memberships
create table if not exists public.chat_members (
  server_id uuid references public.chat_servers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  primary key (server_id, user_id)
);

-- Indexes
create index if not exists chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);
create index if not exists chat_channels_server_idx on public.chat_channels (server_id);

-- RLS
alter table public.chat_servers enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_members enable row level security;

-- Simple policies: logged-in users can read/write (tighten later)
create policy "servers_select" on public.chat_servers for select to authenticated using (true);
create policy "servers_insert" on public.chat_servers for insert to authenticated with check (auth.uid() = owner_id);
create policy "servers_update" on public.chat_servers for update to authenticated using (auth.uid() = owner_id);

create policy "channels_select" on public.chat_channels for select to authenticated using (true);
create policy "channels_insert" on public.chat_channels for insert to authenticated with check (true);

create policy "messages_select" on public.chat_messages for select to authenticated using (true);
create policy "messages_insert" on public.chat_messages for insert to authenticated with check (true);

create policy "members_select" on public.chat_members for select to authenticated using (true);
create policy "members_insert" on public.chat_members for insert to authenticated with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.chat_messages;
