import type { NewsArticle } from "@truestake/shared";
import { motion } from "framer-motion";
import type { MarketView } from "./MarketCard";

function ago(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function NewsCard({ article, onBet }: { article: NewsArticle; onBet: (m: MarketView, d: "up" | "down") => void }) {
  const market: MarketView = {
    id: `news:${article.id}`,
    type: "tweet",
    title: article.title.length > 80 ? article.title.slice(0, 80) + "…" : article.title,
    subtitle: `${article.topic} · ${article.source}`,
    odds: 2,
    participants: 0,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="glass flex flex-col gap-3 border-gold/15 bg-dark-700 p-5"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="pill border-gold/30 text-gold">📰 {article.topic}</span>
        <span className="text-gray-500">{article.source} · {ago(article.publishedAt)}</span>
      </div>

      <a href={article.url} target="_blank" rel="noreferrer" className="text-sm font-semibold leading-relaxed text-gray-100 hover:text-gold">
        {article.title}
      </a>

      <div className="text-[11px] text-gray-600">Will this news push the market UP or DOWN?</div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBet(market, "up")}
          className="rounded-lg border border-win/40 bg-win/10 py-2 text-xs font-bold text-win transition hover:bg-win/20 hover:glow-up active:scale-95"
        >
          ▲ UP
        </button>
        <button
          onClick={() => onBet(market, "down")}
          className="rounded-lg border border-lose/40 bg-lose/10 py-2 text-xs font-bold text-lose transition hover:bg-lose/20 hover:glow-down active:scale-95"
        >
          ▼ DOWN
        </button>
      </div>
    </motion.div>
  );
}
