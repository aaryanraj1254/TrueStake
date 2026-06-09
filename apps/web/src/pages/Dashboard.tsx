import type { Bet, CryptoTicker } from "@truestake/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BetModal } from "@/components/BetModal";
import { MarketCard, type MarketView } from "@/components/MarketCard";
import { PageTransition } from "@/components/PageTransition";
import { StatCard } from "@/components/StatCard";
import { usePoll } from "@/hooks/usePoll";
import { cryptoToViews } from "@/lib/marketViews";

interface WalletResp {
  balance: number;
  supercoins: number;
  paper_balance: number;
}

export default function Dashboard() {
  const { data: wallet, refetch: refetchWallet } = usePoll<WalletResp>("/api/wallet", 30_000);
  const { data: history } = usePoll<Bet[]>("/api/bets/history", 60_000);
  const { data: crypto } = usePoll<CryptoTicker[]>("/api/live/crypto", 30_000);

  const [active, setActive] = useState<{ market: MarketView; dir: "up" | "down" } | null>(null);

  const stats = useMemo(() => {
    const bets = history ?? [];
    const settled = bets.filter((b) => b.result !== "pending");
    const wins = settled.filter((b) => b.result === "won").length;
    const profit = bets.reduce((acc, b) => acc + (Number(b.payout) - Number(b.amount)), 0);
    return {
      totalBets: bets.length,
      winRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
      profit: Math.round(profit),
    };
  }, [history]);

  const markets = (crypto ? cryptoToViews(crypto) : []).slice(0, 6);

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">DASHBOARD</h1>
      <p className="mb-6 text-sm text-gray-500">Your arena at a glance</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Balance" value={wallet?.balance ?? 0} prefix="₹" />
        <StatCard label="Total Bets" value={stats.totalBets} />
        <StatCard label="Win Rate" value={stats.winRate} suffix="%" ring={stats.winRate} />
        <StatCard label="Total Profit" value={stats.profit} prefix="₹" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="glass-gold flex flex-1 items-center gap-2 p-4 text-sm text-gray-300">
          <span className="text-gold">◉</span> SuperCoins:{" "}
          <span className="font-semibold text-gold">{(wallet?.supercoins ?? 0).toLocaleString("en-IN")}</span>
        </div>
        {(wallet?.balance ?? 0) > 500 && (
          <Link
            to="/withdraw"
            className="glass flex items-center justify-center gap-2 border-win/30 p-4 text-sm font-semibold text-win transition hover:border-win/60 hover:shadow-win-glow"
          >
            🦊 Withdraw winnings to MetaMask →
          </Link>
        )}
      </div>

      <h2 className="mb-4 mt-10 font-heading text-2xl tracking-wide text-gray-100">LIVE MARKETS</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} onBet={(market, dir) => setActive({ market, dir })} />
        ))}
      </div>

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
