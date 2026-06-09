import type { Transaction, TxType } from "@truestake/shared";

const META: Record<TxType, { label: string; icon: string }> = {
  deposit: { label: "Deposit", icon: "↓" },
  withdraw: { label: "Withdrawal", icon: "↑" },
  win: { label: "Bet Won", icon: "🏆" },
  loss: { label: "Bet Lost", icon: "✕" },
  bet: { label: "Bet Placed", icon: "🎯" },
  redeem: { label: "Redeemed", icon: "◉" },
};

export function TransactionRow({ tx }: { tx: Transaction }) {
  const meta = META[tx.type] ?? { label: tx.type, icon: "•" };
  const positive = Number(tx.amount) >= 0;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-dark-600 text-sm">{meta.icon}</span>
        <div>
          <div className="text-sm font-semibold text-gray-200">{meta.label}</div>
          <div className="text-xs text-gray-500">
            {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
      </div>
      <div className={`font-mono text-sm font-semibold ${positive ? "text-win" : "text-lose"}`}>
        {positive ? "+" : "−"}₹{Math.abs(Number(tx.amount)).toLocaleString("en-IN")}
      </div>
    </div>
  );
}
