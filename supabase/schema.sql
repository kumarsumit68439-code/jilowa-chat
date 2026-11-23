-- ============================================================
-- Jilowa Chat — FULL schema (run once in Supabase SQL Editor)
-- Same project as AI Gateway Hub is OK
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- core chat ----------
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
  created_at timestamptz default now()
);

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
  primary key (server_id, user_id)
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

-- ---------- bots (BotFather tokens) ----------
create table if not exists public.chat_bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  username text not null,
  description text default '',
  token text not null,
  commands jsonb default '[]'::jsonb,
  webhook_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- unique constraints (safe if re-run)
do $$ begin
  alter table public.chat_bots add constraint chat_bots_username_key unique (username);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.chat_bots add constraint chat_bots_token_key unique (token);
exception when duplicate_object then null; end $$;

create index if not exists chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);
create index if not exists chat_channels_server_idx on public.chat_channels (server_id);
create index if not exists chat_dm_messages_idx on public.chat_dm_messages (dm_id, created_at);
create index if not exists chat_bots_owner_idx on public.chat_bots (owner_id);
create index if not exists chat_bots_token_idx on public.chat_bots (token);

-- ---------- RLS ----------
alter table public.chat_servers enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_dms enable row level security;
alter table public.chat_dm_messages enable row level security;
alter table public.chat_friends enable row level security;
alter table public.chat_bots enable row level security;

-- drop old policies if any, recreate
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'chat_%'
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "chat_servers_all" on public.chat_servers for all to authenticated using (true) with check (true);
create policy "chat_channels_all" on public.chat_channels for all to authenticated using (true) with check (true);
create policy "chat_messages_all" on public.chat_messages for all to authenticated using (true) with check (true);
create policy "chat_members_all" on public.chat_members for all to authenticated using (true) with check (true);
create policy "chat_dms_all" on public.chat_dms for all to authenticated using (true) with check (true);
create policy "chat_dm_messages_all" on public.chat_dm_messages for all to authenticated using (true) with check (true);
create policy "chat_friends_all" on public.chat_friends for all to authenticated using (true) with check (true);

-- bots: owner full access; service role bypasses RLS for API by token
create policy "chat_bots_select_own" on public.chat_bots for select to authenticated using (auth.uid() = owner_id);
create policy "chat_bots_insert_own" on public.chat_bots for insert to authenticated with check (auth.uid() = owner_id);
create policy "chat_bots_update_own" on public.chat_bots for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "chat_bots_delete_own" on public.chat_bots for delete to authenticated using (auth.uid() = owner_id);

-- ---------- Realtime ----------
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.chat_dm_messages;
exception when others then null; end $$;

-- Grant usage (anon cannot read bots; authenticated can own rows)
grant usage on schema public to authenticated, anon, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
