import type { Transaction } from "@truestake/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AddMoneyModal } from "@/components/AddMoneyModal";
import { PageTransition } from "@/components/PageTransition";
import { TransactionRow } from "@/components/TransactionRow";
import { usePoll } from "@/hooks/usePoll";

interface WalletResp {
  balance: number;
  paper_balance: number;
  supercoins: number;
  metamask_address: string | null;
}

export default function Wallet() {
  const { data: wallet, refetch } = usePoll<WalletResp>("/api/wallet", 30_000);
  const { data: txns } = usePoll<Transaction[]>("/api/wallet/transactions", 30_000);
  const [addOpen, setAddOpen] = useState(false);

  const recent = (txns ?? []).slice(0, 6);

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">WALLET</h1>
      <p className="mb-6 text-sm text-gray-500">Manage your balance, deposits & withdrawals</p>

      {/* Balance hero */}
      <div className="glass-gold shimmer mb-6 flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400">Available Balance</div>
          <div className="font-heading text-5xl text-gold-gradient">
            ₹{(wallet?.balance ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            ◉ {(wallet?.supercoins ?? 0).toLocaleString("en-IN")} SuperCoins
          </div>
          <div className="mt-1 text-sm text-gray-500">
            📝 Paper balance:{" "}
            <span className="font-semibold text-gray-300">
              ₹{(wallet?.paper_balance ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setAddOpen(true)} className="btn-gold">
            + Add Money
          </button>
          <Link to="/withdraw" className="btn-ghost">
            Withdraw
          </Link>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl tracking-wide text-gray-100">RECENT ACTIVITY</h2>
          <Link to="/transactions" className="text-sm text-gold hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        )}
      </div>

      <AddMoneyModal open={addOpen} onClose={() => setAddOpen(false)} onCredited={refetch} />
    </PageTransition>
  );
}
