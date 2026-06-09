import type { OrderBook as OrderBookData } from "@truestake/shared";
import { AnimatePresence, motion } from "framer-motion";

// Real-time order book: live list of active bets + visual market sentiment.
export function OrderBook({ book }: { book: OrderBookData | null }) {
  const total = book?.totalPool ?? 0;
  const upPct = total > 0 ? Math.round((book!.poolUp / total) * 100) : 50;
  const downPct = 100 - upPct;

  return (
    <div className="rounded-xl border border-white/10 bg-dark-800/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
          <span className="h-1.5 w-1.5 rounded-full bg-win animate-pulse-dot" /> Live Order Book
        </span>
        <span className="text-[11px] text-gray-500">
          {(book?.orders.length ?? 0)} active · ₹{total.toLocaleString("en-IN")} pool
        </span>
      </div>

      {/* Sentiment bar */}
      <div className="mb-1 flex h-2.5 overflow-hidden rounded-full bg-dark-600">
        <motion.div className="bg-win" animate={{ width: `${upPct}%` }} transition={{ duration: 0.4 }} />
        <motion.div className="bg-lose" animate={{ width: `${downPct}%` }} transition={{ duration: 0.4 }} />
      </div>
      <div className="mb-3 flex justify-between text-[11px]">
        <span className="text-win">▲ {upPct}% ({book?.countUp ?? 0})</span>
        <span className="text-lose">{downPct}% ({book?.countDown ?? 0}) ▼</span>
      </div>

      {/* Live order list */}
      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {(book?.orders ?? []).map((o, i) => (
            <motion.div
              key={`${o.username}-${o.created_at}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                    o.direction === "up" ? "bg-win/20 text-win" : "bg-lose/20 text-lose"
                  }`}
                >
                  {o.direction === "up" ? "▲" : "▼"}
                </span>
                <span className="font-semibold text-gray-200">{o.username}</span>
              </span>
              <span className="font-mono text-gray-300">₹{o.amount.toLocaleString("en-IN")}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {(book?.orders.length ?? 0) === 0 && (
          <p className="py-4 text-center text-xs text-gray-600">No bets yet — be the first.</p>
        )}
      </div>
    </div>
  );
}
