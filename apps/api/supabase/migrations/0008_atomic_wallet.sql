-- Atomic wallet mutations to eliminate read-modify-write lost-update races.
-- All balance changes go through these instead of select-then-update. Safe to re-run.

-- Debit: atomically subtract `p_amount` from the real or paper balance ONLY if
-- sufficient funds exist. Returns the new balance, or NULL if insufficient
-- (no row matched the `>= p_amount` guard).
create or replace function public.debit_wallet(p_user_id uuid, p_amount numeric, p_paper boolean)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  if p_paper then
    update public.wallets
      set paper_balance = paper_balance - p_amount
      where user_id = p_user_id and paper_balance >= p_amount
      returning paper_balance into new_balance;
  else
    update public.wallets
      set balance = balance - p_amount
      where user_id = p_user_id and balance >= p_amount
      returning balance into new_balance;
  end if;
  return new_balance; -- NULL ⇒ insufficient funds
end;
$$;

-- Credit: atomically add `p_amount` to the real or paper balance. Returns new balance.
create or replace function public.credit_wallet(p_user_id uuid, p_amount numeric, p_paper boolean)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  if p_paper then
    update public.wallets set paper_balance = paper_balance + p_amount
      where user_id = p_user_id returning paper_balance into new_balance;
  else
    update public.wallets set balance = balance + p_amount
      where user_id = p_user_id returning balance into new_balance;
  end if;
  return new_balance;
end;
$$;
