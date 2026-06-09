-- Bet insurance: a 10% premium that refunds 50% of the stake on a loss.
-- Safe to re-run. (2FA needs no schema — Supabase MFA manages factors itself.)
alter table public.bets add column if not exists insured boolean not null default false;
