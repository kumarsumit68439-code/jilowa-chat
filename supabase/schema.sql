-- Jilowa Chat schema — run in Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.chat_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '💬',
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.chat_servers(id) on delete cascade,
  name text not null,
  topic text default '',
  is_ai boolean default false,
  type text default 'text', -- text | voice
  created_at timestamptz default now()
);

-- add type column if table already existed without it
do $$ begin
  alter table public.chat_channels add column if not exists type text default 'text';
exception when others then null; end $$;

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

create table if not exists public.chat_members (
  server_id uuid references public.chat_servers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  display_name text,
  primary key (server_id, user_id)
);

do $$ begin
  alter table public.chat_members add column if not exists display_name text;
exception when others then null; end $$;

create table if not exists public.chat_roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.chat_servers(id) on delete cascade,
  name text not null,
  color text default '#99aab5',
  position int default 0
);

create table if not exists public.chat_bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  username text not null unique,
  description text default '',
  token text not null unique,
  commands jsonb default '[]'::jsonb,
  webhook_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

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

create table if not exists public.chat_friends (
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create index if not exists chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);
create index if not exists chat_channels_server_idx on public.chat_channels (server_id);
create index if not exists chat_bots_token_idx on public.chat_bots (token);

alter table public.chat_servers enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_roles enable row level security;
alter table public.chat_bots enable row level security;
alter table public.chat_dms enable row level security;
alter table public.chat_dm_messages enable row level security;
alter table public.chat_friends enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'chat_%'
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "s_all" on public.chat_servers for all to authenticated using (true) with check (true);
create policy "c_all" on public.chat_channels for all to authenticated using (true) with check (true);
create policy "m_all" on public.chat_messages for all to authenticated using (true) with check (true);
create policy "mem_all" on public.chat_members for all to authenticated using (true) with check (true);
create policy "roles_all" on public.chat_roles for all to authenticated using (true) with check (true);
create policy "dms_all" on public.chat_dms for all to authenticated using (true) with check (true);
create policy "dmm_all" on public.chat_dm_messages for all to authenticated using (true) with check (true);
create policy "fr_all" on public.chat_friends for all to authenticated using (true) with check (true);
create policy "bots_own" on public.chat_bots for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

do $$ begin alter publication supabase_realtime add table public.chat_messages;
exception when others then null; end $$;
