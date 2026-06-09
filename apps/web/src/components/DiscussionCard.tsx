import type { RedditPost } from "@truestake/shared";
import { motion } from "framer-motion";
import type { MarketView } from "./MarketCard";

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

export function DiscussionCard({ post, onBet }: { post: RedditPost; onBet: (m: MarketView, d: "up" | "down") => void }) {
  const market: MarketView = {
    id: `reddit:${post.id}`,
    type: "tweet",
    title: post.title.length > 70 ? post.title.slice(0, 70) + "…" : post.title,
    subtitle: `r/${post.subreddit}`,
    price: post.ups,
    odds: 2,
    participants: post.comments,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="glass flex flex-col gap-3 border-gold/15 bg-dark-700 p-5"
    >
      <div className="flex items-center justify-between">
        <span className="pill border-orange-500/40 text-orange-400">🟠 r/{post.subreddit}</span>
        <span className="text-xs text-gray-500">▲ {fmt(post.ups)} · 💬 {fmt(post.comments)}</span>
      </div>

      <a href={post.url} target="_blank" rel="noreferrer" className="text-sm font-semibold leading-relaxed text-gray-100 hover:text-gold">
        {post.title}
      </a>

      <div className="text-[11px] text-gray-600">Will this discussion's momentum grow?</div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBet(market, "up")}
          className="rounded-lg border border-win/40 bg-win/10 py-2 text-xs font-bold text-win transition hover:bg-win/20 hover:glow-up active:scale-95"
        >
          🐂 BULLISH
        </button>
        <button
          onClick={() => onBet(market, "down")}
          className="rounded-lg border border-lose/40 bg-lose/10 py-2 text-xs font-bold text-lose transition hover:bg-lose/20 hover:glow-down active:scale-95"
        >
          🐻 BEARISH
        </button>
      </div>
    </motion.div>
  );
}
