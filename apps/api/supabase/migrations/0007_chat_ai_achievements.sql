-- Market chat, AI predictions, streaks & achievements. Safe to re-run.

-- ─────────────────────────── market chat ────────────────────────────
create table if not exists public.market_chat (
  id uuid primary key default gen_random_uuid(),
  market_id text not null,
  user_id uuid not null references public.users (id) on delete cascade,
  username text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists market_chat_market_idx on public.market_chat (market_id, created_at);

-- Realtime so messages appear live for everyone in the room.
do $$ begin
  alter publication supabase_realtime add table public.market_chat;
exception when others then null; end $$;

-- ───────────────────────── AI predictions ───────────────────────────
create table if not exists public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  market_id text not null,
  symbol text not null,
  title text not null,
  prediction text not null,        -- up | down | neutral
  confidence numeric(5, 2) not null,
  reasoning text not null,
  price numeric(18, 6),
  created_at timestamptz not null default now()
);
create index if not exists ai_predictions_market_idx on public.ai_predictions (market_id, created_at);

-- ──────────────────── streaks & achievements ────────────────────────
alter table public.users add column if not exists current_streak integer not null default 0;
alter table public.users add column if not exists best_streak integer not null default 0;

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  code text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);
create index if not exists achievements_user_idx on public.achievements (user_id);

-- ─────────────────────────────── RLS ────────────────────────────────
alter table public.market_chat enable row level security;
alter table public.ai_predictions enable row level security;
alter table public.achievements enable row level security;

-- Chat: any authenticated user can read the room and post as themselves.
drop policy if exists "chat readable" on public.market_chat;
create policy "chat readable" on public.market_chat for select using (auth.uid() is not null);
drop policy if exists "chat insert own" on public.market_chat;
create policy "chat insert own" on public.market_chat for insert with check (auth.uid() = user_id);

-- AI predictions + achievements are public-readable (shown on profile/leaderboard).
drop policy if exists "ai readable" on public.ai_predictions;
create policy "ai readable" on public.ai_predictions for select using (true);
drop policy if exists "achievements readable" on public.achievements;
create policy "achievements readable" on public.achievements for select using (true);
