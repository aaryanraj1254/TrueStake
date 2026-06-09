import type { MarketType } from "@truestake/shared";
import { motion } from "framer-motion";
import { useState } from "react";
import { useOrderBook } from "@/hooks/useOrderBook";
import { BookmarkButton } from "./BookmarkButton";
import { Countdown } from "./Countdown";
import { SetAlertModal } from "./SetAlertModal";

export interface MarketView {
  id: string;
  type: MarketType;
  title: string;
  subtitle?: string;
  price?: number;
  change?: number;
  odds: number;
  participants: number;
  expiresAt: string;
}

interface Props {
  market: MarketView;
  onBet: (market: MarketView, direction: "up" | "down") => void;
}

const TYPE_LABEL: Record<MarketType, string> = {
  crypto: "CRYPTO",
  stock: "STOCK",
  ipl: "IPL",
  forex: "FOREX",
  tweet: "TWEET",
};

export function MarketCard({ market, onBet }: Props) {
  const book = useOrderBook(market.id);
  const hasPool = !!book && book.totalPool > 0;
  const upPct = hasPool ? Math.round((book!.poolUp / book!.totalPool) * 100) : 50;
  const [alertOpen, setAlertOpen] = useState(false);
  const canAlert = (market.type === "crypto" || market.type === "stock") && market.price !== undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="glass group flex flex-col gap-4 border-gold/15 bg-dark-700 p-5 transition hover:border-gold/40 hover:shadow-gold"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="pill border-gold/30 text-gold">{TYPE_LABEL[market.type]}</span>
          <h3 className="mt-2 truncate font-heading text-xl tracking-wide text-gray-100">{market.title}</h3>
          {market.subtitle && <p className="truncate text-sm text-gray-500">{market.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canAlert && (
            <button
              onClick={() => setAlertOpen(true)}
              title="Set price alert"
              className="text-lg text-gray-500 transition hover:text-gold"
            >
              🔔
            </button>
          )}
          <BookmarkButton marketId={market.id} marketType={market.type} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          {market.price !== undefined && (
            <div className="font-heading text-2xl text-gray-100">₹{market.price.toLocaleString("en-IN")}</div>
          )}
          {market.change !== undefined && (
            <div className={`text-sm font-semibold ${market.change >= 0 ? "text-win" : "text-lose"}`}>
              {market.change >= 0 ? "▲" : "▼"} {Math.abs(market.change).toFixed(2)}%
            </div>
          )}
        </div>
        <span className="pill text-gold">{(hasPool ? book!.oddsUp : market.odds).toFixed(2)}× odds</span>
      </div>

      {/* Live market sentiment bar */}
      {hasPool && (
        <div>
          <div className="flex h-2 overflow-hidden rounded-full bg-dark-600">
            <motion.div className="bg-win" animate={{ width: `${upPct}%` }} transition={{ duration: 0.4 }} />
            <div className="flex-1 bg-lose" />
          </div>
          <div className="mt-1 flex justify-between text-[10px]">
            <span className="text-win">▲ {upPct}%</span>
            <span className="text-lose">{100 - upPct}% ▼</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-win animate-pulse-dot" />
          {hasPool
            ? `${book!.orders.length} live bet${book!.orders.length === 1 ? "" : "s"}`
            : `${market.participants.toLocaleString("en-IN")} betting`}
        </span>
        <Countdown to={market.expiresAt} compact />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBet(market, "up")}
          className="rounded-lg border border-win/40 bg-win/10 py-2.5 font-semibold text-win transition hover:bg-win/20 hover:glow-up active:scale-95"
        >
          BET UP ▲
        </button>
        <button
          onClick={() => onBet(market, "down")}
          className="rounded-lg border border-lose/40 bg-lose/10 py-2.5 font-semibold text-lose transition hover:bg-lose/20 hover:glow-down active:scale-95"
        >
          BET DOWN ▼
        </button>
      </div>

      {canAlert && <SetAlertModal market={market} open={alertOpen} onClose={() => setAlertOpen(false)} />}
    </motion.div>
  );
}
