import type { CryptoTicker, ForexRate, IplMatch, MarketType, StockTicker } from "@truestake/shared";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { BetModal } from "@/components/BetModal";
import { MarketCard, type MarketView } from "@/components/MarketCard";
import { PageTransition } from "@/components/PageTransition";
import { usePoll } from "@/hooks/usePoll";
import { cryptoToViews, forexToViews, iplToViews, stocksToViews } from "@/lib/marketViews";

type Tab = "ALL" | "CRYPTO" | "STOCKS" | "IPL" | "FOREX" | "TWEETS";
const TABS: Tab[] = ["ALL", "CRYPTO", "STOCKS", "IPL", "FOREX", "TWEETS"];

const TAB_TO_TYPE: Record<Tab, MarketType | null> = {
  ALL: null,
  CRYPTO: "crypto",
  STOCKS: "stock",
  IPL: "ipl",
  FOREX: "forex",
  TWEETS: "tweet",
};

export default function Markets() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState<{ market: MarketView; dir: "up" | "down" } | null>(null);

  const { data: crypto } = usePoll<CryptoTicker[]>("/api/live/crypto", 30_000);
  const { data: stocks } = usePoll<StockTicker[]>("/api/live/stocks", 60_000);
  const { data: forex } = usePoll<ForexRate>("/api/live/forex", 60_000);
  const { data: ipl } = usePoll<IplMatch[]>("/api/live/ipl", 30_000);
  const { data: wallet, refetch: refetchWallet } = usePoll<{ balance: number; paper_balance: number }>(
    "/api/wallet",
    30_000,
  );

  // Debounce search input by 300ms.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const all = useMemo<MarketView[]>(() => {
    return [
      ...(crypto ? cryptoToViews(crypto) : []),
      ...(stocks ? stocksToViews(stocks) : []),
      ...(forex ? forexToViews(forex) : []),
      ...(ipl ? iplToViews(ipl) : []),
    ];
  }, [crypto, stocks, forex, ipl]);

  const filtered = all.filter((m) => {
    const typeMatch = TAB_TO_TYPE[tab] === null || m.type === TAB_TO_TYPE[tab];
    const searchMatch = !debounced || m.title.toLowerCase().includes(debounced);
    return typeMatch && searchMatch;
  });

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-wide text-gray-100">MARKETS</h1>
          <p className="text-sm text-gray-500">{filtered.length} live markets</p>
        </div>
        <input
          placeholder="Search markets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-dark md:max-w-xs"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "text-dark-900" : "text-gray-400 hover:text-gray-100"
            }`}
          >
            {tab === t && (
              <motion.span layoutId="market-tab" className="absolute inset-0 rounded-lg bg-gold-gradient" />
            )}
            <span className="relative z-10">{t}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <MarketCard key={m.id} market={m} onBet={(market, dir) => setActive({ market, dir })} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center text-gray-500">No markets match your filters.</div>
      )}

      <BetModal
        market={active?.market ?? null}
        direction={active?.dir ?? "up"}
        bankroll={wallet?.balance ?? 0}
        paperBankroll={wallet?.paper_balance ?? 0}
        onClose={() => setActive(null)}
        onPlaced={refetchWallet}
      />
    </PageTransition>
  );
}
