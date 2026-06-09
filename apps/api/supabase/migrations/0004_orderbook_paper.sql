-- Order book realtime + dynamic odds + paper trading. Safe to re-run.

-- 1) Enable Supabase Realtime on markets (public-readable already). Clients
--    subscribe to market UPDATEs (pool/odds changes) to refresh the order book
--    live — without ever exposing the bets table to other users.
do $$ begin
  alter publication supabase_realtime add table public.markets;
exception when others then null; end $$;

-- 2) Dynamic parimutuel odds + side pools on markets.
alter table public.markets add column if not exists pool_up numeric(14, 2) not null default 0;
alter table public.markets add column if not exists pool_down numeric(14, 2) not null default 0;
alter table public.markets add column if not exists current_odds numeric(8, 3);

-- 3) Paper trading: a flag per bet + a separate virtual balance per wallet.
alter table public.bets add column if not exists paper_trade boolean not null default false;
alter table public.wallets add column if not exists paper_balance numeric(14, 2) not null default 10000;
