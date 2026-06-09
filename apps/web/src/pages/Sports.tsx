import type { SportEvent } from "@truestake/shared";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { BetModal } from "@/components/BetModal";
import type { MarketView } from "@/components/MarketCard";
import { PageTransition } from "@/components/PageTransition";
import { SportCard } from "@/components/SportCard";
import { usePoll } from "@/hooks/usePoll";

// Tab label → matching TheSportsDB sport value(s).
const TABS: { label: string; sports: string[] | null }[] = [
  { label: "ALL", sports: null },
  { label: "CRICKET", sports: ["Cricket"] },
  { label: "FOOTBALL", sports: ["Soccer"] },
  { label: "TENNIS", sports: ["Tennis"] },
  { label: "BASKETBALL", sports: ["Basketball"] },
  { label: "F1", sports: ["Motorsport"] },
  { label: "KABADDI", sports: ["Kabaddi"] },
];

export default function Sports() {
  const { data, loading } = usePoll<SportEvent[]>("/api/live/sports", 30_000);
  const { data: wallet, refetch } = usePoll<{ balance: number; paper_balance: number }>("/api/wallet", 30_000);
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<{ market: MarketView; dir: "up" | "down" } | null>(null);

  const events = data ?? [];
  const liveCount = events.filter((e) => e.state === "LIVE").length;

  const filtered = useMemo(() => {
    const want = TABS[tab]!.sports;
    return want ? events.filter((e) => want.includes(e.sport)) : events;
  }, [events, tab]);

  return (
    <PageTransition>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-4xl tracking-wide text-gray-100">SPORTS</h1>
          <p className="text-sm text-gray-500">Live scores across the globe · refreshes every 30s</p>
        </div>
        {liveCount > 0 && (
          <span className="flex items-center gap-2 rounded-lg border border-lose/40 bg-lose/10 px-3 py-1.5 text-sm font-semibold text-lose">
            <span className="h-2 w-2 rounded-full bg-lose animate-pulse-dot" /> {liveCount} LIVE
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setTab(i)}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === i ? "text-dark-900" : "text-gray-400 hover:text-gray-100"
            }`}
          >
            {tab === i && <motion.span layoutId="sports-tab" className="absolute inset-0 rounded-lg bg-gold-gradient" />}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {loading && events.length === 0 && <div className="mt-8 text-gray-500">Loading live scores…</div>}

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => (
          <SportCard key={e.id} event={e} onBet={(market, dir) => setActive({ market, dir })} />
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="mt-16 text-center text-gray-500">No {TABS[tab]!.label.toLowerCase()} events right now.</div>
      )}

      <BetModal
        market={active?.market ?? null}
        direction={active?.dir ?? "up"}
        bankroll={wallet?.balance ?? 0}
        paperBankroll={wallet?.paper_balance ?? 0}
        onClose={() => setActive(null)}
        onPlaced={refetch}
      />
    </PageTransition>
  );
}
