import type { Transaction, TxType } from "@truestake/shared";
import { useMemo, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { TransactionRow } from "@/components/TransactionRow";
import { usePoll } from "@/hooks/usePoll";

type Filter = "all" | TxType;
const FILTERS: Filter[] = ["all", "deposit", "bet", "win", "withdraw", "redeem"];

export default function Transactions() {
  const { data, loading } = usePoll<Transaction[]>("/api/wallet/transactions", 30_000);
  const [filter, setFilter] = useState<Filter>("all");

  const txns = useMemo(() => {
    const all = data ?? [];
    return filter === "all" ? all : all.filter((t) => t.type === filter);
  }, [data, filter]);

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">TRANSACTIONS</h1>
      <p className="mb-6 text-sm text-gray-500">Your complete ledger</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase transition ${
              filter === f ? "bg-gold-gradient text-dark-900" : "border border-white/10 text-gray-400 hover:border-gold/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="glass p-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : txns.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No transactions in this category.</p>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {txns.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
