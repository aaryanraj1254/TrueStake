-- TrueStake wallet system: ledger, withdrawals, payment idempotency, admin.
-- Safe to re-run.

-- 1) BET transaction type for stakes (DEPOSIT/WIN/WITHDRAW/REDEEM/LOSS already exist).
alter type tx_type add value if not exists 'bet';

-- 2) Admin flag on users.
alter table public.users add column if not exists is_admin boolean not null default false;

-- 3) Withdrawals with approval workflow.
do $$ begin
  create type withdrawal_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  status withdrawal_status not null default 'pending',
  note text,
  processed_by uuid references public.users (id),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists withdrawals_user_idx on public.withdrawals (user_id);
create index if not exists withdrawals_status_idx on public.withdrawals (status);

-- 4) Payments — one row per captured Razorpay payment. Unique payment id makes
--    crediting idempotent (verify endpoint + webhook can both fire safely).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  amount numeric(14, 2) not null,
  status text not null default 'captured',
  created_at timestamptz not null default now()
);

-- 5) Webhook idempotency — dedupe by Razorpay event id.
create table if not exists public.processed_webhooks (
  event_id text primary key,
  created_at timestamptz not null default now()
);

-- RLS — users read their own rows; service role (API) bypasses RLS for writes.
alter table public.withdrawals enable row level security;
alter table public.payments enable row level security;

drop policy if exists "own withdrawals" on public.withdrawals;
create policy "own withdrawals" on public.withdrawals for select using (auth.uid() = user_id);

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments for select using (auth.uid() = user_id);
