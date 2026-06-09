-- Add payout method + destination to withdrawals (bank transfer vs MetaMask).
-- Safe to re-run.

do $$ begin
  create type withdrawal_method as enum ('bank', 'metamask');
exception when duplicate_object then null; end $$;

alter table public.withdrawals
  add column if not exists method withdrawal_method not null default 'bank';

alter table public.withdrawals
  add column if not exists destination text; -- bank ref or 0x… wallet address
