-- Safe to run more than once. Run in Supabase → SQL Editor.

-- 1. the sender records why a push failed
alter table public.notification_queue add column if not exists error text;

-- 2. the Edge Function runs as service_role and needs explicit table permissions
grant usage on schema public to service_role;
grant select, insert, update, delete on public.notification_queue to service_role;
grant select, insert, update, delete on public.push_subscriptions to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 3. the table that holds each user's calendar data
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  logs jsonb not null default '{}'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  nid integer not null default 100,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
drop policy if exists "users manage own app state" on public.app_state;
create policy "users manage own app state" on public.app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.app_state to authenticated;
