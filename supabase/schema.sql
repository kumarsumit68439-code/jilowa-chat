-- Jilowa Chat schema (run in Supabase SQL Editor — same project as AI Gateway preferred)

create extension if not exists pgcrypto;

-- Servers (Discord guilds)
create table if not exists public.chat_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '💬',
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Channels
create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.chat_servers(id) on delete cascade,
  name text not null,
  topic text default '',
  is_ai boolean default false,
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

-- Members
create table if not exists public.chat_members (
  server_id uuid references public.chat_servers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  primary key (server_id, user_id)
);

-- Direct messages (Telegram-style)
create table if not exists public.chat_dms (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references auth.users(id) on delete cascade,
  user_b uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

create table if not exists public.chat_dm_messages (
  id uuid primary key default gen_random_uuid(),
  dm_id uuid references public.chat_dms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

-- Friends
create table if not exists public.chat_friends (
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  status text default 'pending', -- pending | accepted
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- Platform bots (BotFather style — tokens for THIS platform, not official Telegram/Discord)
create table if not exists public.chat_bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  description text default '',
  token text not null unique,
  commands jsonb default '[]'::jsonb,
  webhook_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);
create index if not exists chat_channels_server_idx on public.chat_channels (server_id);
create index if not exists chat_dm_messages_idx on public.chat_dm_messages (dm_id, created_at);
create index if not exists chat_bots_owner_idx on public.chat_bots (owner_id);

alter table public.chat_servers enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_dms enable row level security;
alter table public.chat_dm_messages enable row level security;
alter table public.chat_friends enable row level security;
alter table public.chat_bots enable row level security;

-- Policies (authenticated)
do $$ begin
  create policy "servers_all" on public.chat_servers for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "channels_all" on public.chat_channels for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "messages_all" on public.chat_messages for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "members_all" on public.chat_members for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "dms_all" on public.chat_dms for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "dm_msg_all" on public.chat_dm_messages for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "friends_all" on public.chat_friends for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "bots_owner" on public.chat_bots for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.chat_dm_messages;
exception when duplicate_object then null; end $$;
