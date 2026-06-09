import type { Bet, BetResult, MarketType } from "@truestake/shared";
import { useMemo, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { usePoll } from "@/hooks/usePoll";

type BetRow = Bet & {
  paper_trade?: boolean;
  insured?: boolean;
  markets?: { title?: string; type?: MarketType; status?: string } | null;
};

type Filter = "all" | "pending" | "won" | "lost";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "OPEN" },
  { key: "won", label: "WON" },
  { key: "lost", label: "LOST" },
  { key: "all", label: "ALL" },
];

const RESULT_STYLE: Record<BetResult, string> = {
  pending: "border-gold/40 text-gold",
  won: "border-win/40 text-win",
  lost: "border-lose/40 text-lose",
};

export default function MyBets() {
  const { data, loading } = usePoll<BetRow[]>("/api/bets/history", 20_000);
  const [filter, setFilter] = useState<Filter>("pending");

  const bets = data ?? [];
  const counts = useMemo(() => {
    const c = { pending: 0, won: 0, lost: 0 };
    for (const b of bets) c[b.result]++;
    return c;
  }, [bets]);

  const rows = filter === "all" ? bets : bets.filter((b) => b.result === filter);

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">MY BETS</h1>
      <p className="mb-6 text-sm text-gray-500">
        {counts.pending} open · {counts.won} won · {counts.lost} lost
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase transition ${
              filter === f.key ? "bg-gold-gradient text-dark-900" : "border border-white/10 text-gray-400 hover:border-gold/40"
            }`}
          >
            {f.label}
            {f.key !== "all" && counts[f.key] > 0 && <span className="ml-1.5 opacity-70">{counts[f.key]}</span>}
          </button>
        ))}
      </div>

      <div className="glass-gold overflow-hidden">
        {loading && bets.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No {filter === "all" ? "" : filter} bets here yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((b) => {
              const profit = Number(b.payout) - Number(b.amount);
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${b.direction === "up" ? "text-win" : "text-lose"}`}
                      >
                        {b.direction === "up" ? "▲" : "▼"}
                      </span>
                      <span className="truncate font-semibold text-gray-100">{b.markets?.title ?? "Market"}</span>
                      {b.paper_trade && <span className="pill text-gray-400">📝 Paper</span>}
                      {b.insured && <span className="pill border-win/30 text-win">🛡️</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {b.markets?.type?.toUpperCase() ?? "—"} · {new Date(b.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono text-sm text-gray-200">₹{Number(b.amount).toLocaleString("en-IN")}</div>
                      {b.result !== "pending" && (
                        <div className={`text-xs font-semibold ${profit >= 0 ? "text-win" : "text-lose"}`}>
                          {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                    <span className={`pill shrink-0 ${RESULT_STYLE[b.result]}`}>{b.result.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
