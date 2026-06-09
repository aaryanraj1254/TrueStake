import type { NewsArticle, RedditPost } from "@truestake/shared";
import { motion } from "framer-motion";
import { useState } from "react";
import { BetModal } from "@/components/BetModal";
import { DiscussionCard } from "@/components/DiscussionCard";
import type { MarketView } from "@/components/MarketCard";
import { NewsCard } from "@/components/NewsCard";
import { PageTransition } from "@/components/PageTransition";
import { usePoll } from "@/hooks/usePoll";

const TABS = ["DISCUSSIONS", "NEWS"] as const;

export default function Trending() {
  const { data: posts } = usePoll<RedditPost[]>("/api/live/trending", 60_000);
  const { data: news } = usePoll<NewsArticle[]>("/api/live/news", 5 * 60_000);
  const { data: wallet, refetch } = usePoll<{ balance: number; paper_balance: number }>("/api/wallet", 30_000);
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<{ market: MarketView; dir: "up" | "down" } | null>(null);

  const onBet = (market: MarketView, dir: "up" | "down") => setActive({ market, dir });

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">TRENDING PREDICTIONS</h1>
      <p className="mb-6 text-sm text-gray-500">
        Bet on what's buzzing — Reddit discussions & breaking news move the markets
      </p>

      <div className="mb-8 flex gap-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`relative rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === i ? "text-dark-900" : "text-gray-400 hover:text-gray-100"
            }`}
          >
            {tab === i && <motion.span layoutId="trend-tab" className="absolute inset-0 rounded-lg bg-gold-gradient" />}
            <span className="relative z-10">{t === "DISCUSSIONS" ? "🔥 Discussions" : "📰 News"}</span>
          </button>
        ))}
      </div>

      {tab === 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(posts ?? []).map((p) => (
            <DiscussionCard key={p.id} post={p} onBet={onBet} />
          ))}
          {!posts && <div className="text-gray-500">Loading discussions…</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(news ?? []).map((a) => (
            <NewsCard key={a.id} article={a} onBet={onBet} />
          ))}
          {!news && <div className="text-gray-500">Loading news…</div>}
        </div>
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
