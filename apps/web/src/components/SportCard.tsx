import type { SportEvent } from "@truestake/shared";
import { motion } from "framer-motion";
import type { MarketView } from "./MarketCard";

const ICON: Record<string, string> = {
  Cricket: "🏏",
  Soccer: "⚽",
  Tennis: "🎾",
  Basketball: "🏀",
  Motorsport: "🏎️",
  Kabaddi: "🤼",
};

interface Props {
  event: SportEvent;
  onBet: (market: MarketView, direction: "up" | "down") => void;
}

export function SportCard({ event, onBet }: Props) {
  const isLive = event.state === "LIVE";

  const market: MarketView = {
    id: `sport:${event.id}`,
    type: "ipl", // sports route through the generic "ipl" market category
    title: `${event.homeTeam} vs ${event.awayTeam}`,
    subtitle: `${event.sport} · ${event.league}`,
    odds: 2,
    participants: 0,
    expiresAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass flex flex-col gap-3 p-5 ${isLive ? "border-lose/30" : "border-white/5"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="pill border-gold/30 text-gold">
          <span>{ICON[event.sport] ?? "🏅"}</span> {event.league || event.sport}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full border border-lose/50 px-2 py-0.5 text-[11px] font-bold text-lose">
            <span className="h-2 w-2 rounded-full bg-lose animate-pulse-dot" /> LIVE
          </span>
        ) : (
          <span className={`pill ${event.state === "FINISHED" ? "text-gray-500" : "text-gold/80"}`}>{event.state}</span>
        )}
      </div>

      {/* Teams + score */}
      <div className="space-y-1.5">
        <Row name={event.homeTeam} score={event.homeScore} live={isLive} />
        <Row name={event.awayTeam} score={event.awayScore} live={isLive} />
      </div>

      <div className="text-xs text-gray-400">{event.status || event.title}</div>

      {isLive && (event.homeTeam || event.awayTeam) && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onBet(market, "up")}
            className="truncate rounded-lg border border-win/40 bg-win/10 py-2 text-xs font-semibold text-win transition hover:bg-win/20 hover:glow-up active:scale-95"
          >
            {event.homeTeam || "Home"} ▲
          </button>
          <button
            onClick={() => onBet(market, "down")}
            className="truncate rounded-lg border border-lose/40 bg-lose/10 py-2 text-xs font-semibold text-lose transition hover:bg-lose/20 hover:glow-down active:scale-95"
          >
            {event.awayTeam || "Away"} ▼
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Row({ name, score, live }: { name: string; score: string | null; live: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="truncate font-semibold text-gray-100">{name || "TBD"}</span>
      <span className={`ml-2 font-mono text-lg ${live ? "text-gold" : "text-gray-500"}`}>{score ?? "—"}</span>
    </div>
  );
}
