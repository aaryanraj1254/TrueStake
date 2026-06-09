-- TrueStake initial schema
-- Run via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- ─────────────────────────────── users ───────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  username text unique not null,
  avatar_url text,
  supercoins integer not null default 0,
  referral_code text unique not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────── wallets ─────────────────────────────
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  balance numeric(14, 2) not null default 0,
  metamask_address text,
  unique (user_id)
);

-- ─────────────────────────────── markets ─────────────────────────────
do $$ begin
  create type market_type as enum ('crypto', 'stock', 'ipl', 'forex', 'tweet');
exception when duplicate_object then null; end $$;
do $$ begin
  create type market_status as enum ('open', 'closed', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  type market_type not null,
  title text not null,
  data jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  status market_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ──────────────────────────────── bets ───────────────────────────────
do $$ begin
  create type bet_direction as enum ('up', 'down');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bet_result as enum ('pending', 'won', 'lost');
exception when duplicate_object then null; end $$;

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  direction bet_direction not null,
  prediction numeric(18, 6) not null,
  result bet_result not null default 'pending',
  payout numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists bets_user_idx on public.bets (user_id);
create index if not exists bets_market_idx on public.bets (market_id);
create index if not exists bets_created_idx on public.bets (created_at);

-- ──────────────────────────── transactions ───────────────────────────
do $$ begin
  create type tx_type as enum ('deposit', 'withdraw', 'win', 'loss', 'redeem');
exception when duplicate_object then null; end $$;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type tx_type not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions (user_id);

-- ──────────────────────────── redemptions ────────────────────────────
create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null,
  coins_used integer not null check (coins_used > 0),
  voucher_code text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── watchlist ─────────────────────────────
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  market_id text not null,
  market_type market_type not null,
  unique (user_id, market_id)
);

-- ───────────────────────────── referrals ─────────────────────────────
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users (id) on delete cascade,
  referred_id uuid not null references public.users (id) on delete cascade,
  coins_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

-- ─────────────────────────────── RLS ─────────────────────────────────
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.bets enable row level security;
alter table public.transactions enable row level security;
alter table public.redemptions enable row level security;
alter table public.watchlist enable row level security;
alter table public.referrals enable row level security;
alter table public.markets enable row level security;

-- Users can read/update their own row.
create policy "own user row" on public.users
  for select using (auth.uid() = id);
create policy "update own user row" on public.users
  for update using (auth.uid() = id);

create policy "own wallet" on public.wallets
  for select using (auth.uid() = user_id);

create policy "own bets" on public.bets
  for select using (auth.uid() = user_id);

create policy "own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "own redemptions" on public.redemptions
  for select using (auth.uid() = user_id);

create policy "own watchlist" on public.watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Markets are public-readable.
create policy "markets readable" on public.markets
  for select using (true);

-- Leaderboard reads usernames; allow public select of public profile fields.
create policy "public profiles" on public.users
  for select using (true);

-- ─────────── trigger: provision profile + wallet on signup ───────────
-- Fires when Supabase Auth creates a new auth.users row. Runs as the table
-- owner (security definer) so it can bypass RLS to seed the profile + wallet.
-- Username / referral_code are read from the signUp metadata; sensible
-- fallbacks are generated if absent.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username, referral_code, supercoins)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'referral_code', upper(substr(md5(random()::text), 1, 8))),
    0
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 1000)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
