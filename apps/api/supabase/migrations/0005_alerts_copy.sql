-- Price alerts, web-push subscriptions, and copy trading. Safe to re-run.

-- ─────────────────────────── price alerts ───────────────────────────
do $$ begin
  create type alert_direction as enum ('above', 'below');
exception when duplicate_object then null; end $$;
do $$ begin
  create type alert_status as enum ('active', 'triggered');
exception when duplicate_object then null; end $$;

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  market_type market_type not null,
  market_id text not null,        -- synthetic id, e.g. "crypto:bitcoin"
  symbol text not null,           -- "bitcoin" / "RELIANCE"
  title text not null,
  target_price numeric(18, 6) not null,
  direction alert_direction not null,
  status alert_status not null default 'active',
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists alerts_active_idx on public.alerts (status);
create index if not exists alerts_user_idx on public.alerts (user_id);

-- ────────────────────── web push subscriptions ──────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────── copy trading ───────────────────────────
create table if not exists public.copy_trading (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users (id) on delete cascade,
  trader_id uuid not null references public.users (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (follower_id, trader_id),
  check (follower_id <> trader_id)
);
create index if not exists copy_trader_idx on public.copy_trading (trader_id, active);

-- RLS — users manage their own rows; API uses the service role for fan-out.
alter table public.alerts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.copy_trading enable row level security;

drop policy if exists "own alerts" on public.alerts;
create policy "own alerts" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own copy trading" on public.copy_trading;
create policy "own copy trading" on public.copy_trading for select using (auth.uid() = follower_id);
