import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useOrderBook } from "@/hooks/useOrderBook";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { fireWinConfetti } from "@/lib/confetti";
import { AskAI } from "./AskAI";
import type { MarketView } from "./MarketCard";
import { MarketChat } from "./MarketChat";
import { OrderBook } from "./OrderBook";
import { RiskCalculator } from "./RiskCalculator";

interface Props {
  market: MarketView | null;
  direction: "up" | "down";
  bankroll: number;
  paperBankroll?: number;
  onClose: () => void;
  onPlaced?: () => void;
}

export function BetModal({ market, direction, bankroll, paperBankroll = 0, onClose, onPlaced }: Props) {
  const [amount, setAmount] = useState(100);
  const [paper, setPaper] = useState(false);
  const [insured, setInsured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const book = useOrderBook(market?.id ?? null);
  // Live parimutuel odds for the chosen side; fall back to the card's seed odds.
  const liveOdds = book ? (direction === "up" ? book.oddsUp : book.oddsDown) : (market?.odds ?? 2);

  const premium = insured ? Math.round(amount * 0.1) : 0;
  const totalCost = amount + premium;
  const effectiveBankroll = paper ? paperBankroll : bankroll;
  const insufficient = totalCost > effectiveBankroll;

  async function confirm() {
    if (!market) return;
    if (insufficient) {
      setError("Insufficient balance");
      toast(`Insufficient ${paper ? "paper " : ""}balance — you have ₹${effectiveBankroll.toLocaleString("en-IN")}`, "error");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/bets", {
        marketId: market.id,
        marketType: market.type,
        marketTitle: market.title,
        amount,
        direction,
        prediction: market.price ?? 0,
        expiresAt: market.expiresAt,
        paperTrade: paper,
        insured,
      });
      fireWinConfetti();
      toast(
        `${paper ? "📝 Paper bet" : "Bet"} placed: ₹${amount.toLocaleString("en-IN")} ${direction.toUpperCase()} on ${market.title}`,
        "success",
      );
      onPlaced?.();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to place bet";
      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {market && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-gold max-h-[92vh] w-full max-w-md overflow-y-auto p-6"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className={`pill ${direction === "up" ? "border-win/40 text-win" : "border-lose/40 text-lose"}`}>
                BET {direction.toUpperCase()} {direction === "up" ? "▲" : "▼"}
              </span>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-200">
                ✕
              </button>
            </div>

            <h2 className="font-heading text-2xl tracking-wide text-gray-100">{market.title}</h2>
            {market.price !== undefined && (
              <p className="text-sm text-gray-400">Current: ₹{market.price.toLocaleString("en-IN")}</p>
            )}

            {/* Live odds (parimutuel) */}
            <div className="my-3 flex items-center justify-between rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
              <span className="text-xs uppercase tracking-widest text-gray-400">Live odds</span>
              <motion.span
                key={liveOdds}
                initial={{ scale: 1.3, color: "#F7C948" }}
                animate={{ scale: 1, color: "#F0B429" }}
                className="font-heading text-xl text-gold"
              >
                {liveOdds.toFixed(2)}×
              </motion.span>
            </div>

            {/* Paper trade toggle */}
            <button
              onClick={() => setPaper((p) => !p)}
              className={`mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                paper ? "border-gold/50 bg-gold/10 text-gold" : "border-white/10 text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                📝 Paper Trade <span className="text-[11px] text-gray-500">(risk-free practice)</span>
              </span>
              <span className={`relative h-5 w-9 rounded-full transition ${paper ? "bg-gold" : "bg-dark-500"}`}>
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-dark-900 transition-all ${paper ? "left-4.5" : "left-0.5"}`}
                  style={{ left: paper ? "1.125rem" : "0.125rem" }}
                />
              </span>
            </button>

            <label className="mb-1 block text-xs uppercase tracking-widest text-gray-400">
              Stake (₹) · {paper ? "Paper" : "Real"} balance: ₹{effectiveBankroll.toLocaleString("en-IN")}
            </label>
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="input-dark mb-2"
            />
            <div className="mb-4 flex gap-2">
              {[100, 500, 1000, 5000].map((v) => (
                <button key={v} onClick={() => setAmount(v)} className="btn-ghost flex-1 py-1.5 text-xs">
                  ₹{v}
                </button>
              ))}
            </div>

            {/* Insure this bet toggle */}
            <button
              onClick={() => setInsured((i) => !i)}
              className={`mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                insured ? "border-win/50 bg-win/10 text-win" : "border-white/10 text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                🛡️ Insure this bet <span className="text-[11px] text-gray-500">(+10% · 50% back if you lose)</span>
              </span>
              <span className={`relative h-5 w-9 rounded-full transition ${insured ? "bg-win" : "bg-dark-500"}`}>
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-dark-900 transition-all"
                  style={{ left: insured ? "1.125rem" : "0.125rem" }}
                />
              </span>
            </button>

            <RiskCalculator amount={amount} odds={liveOdds} bankroll={effectiveBankroll} />

            {insured && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-win/20 bg-win/5 px-3 py-2 text-xs">
                <span className="text-gray-300">
                  Stake ₹{amount.toLocaleString("en-IN")} + premium ₹{premium.toLocaleString("en-IN")}
                </span>
                <span className="font-semibold text-win">Refund ₹{Math.round(amount * 0.5).toLocaleString("en-IN")} if lost</span>
              </div>
            )}

            <div className="mt-3">
              <AskAI market={market} />
            </div>

            <div className="mt-3">
              <OrderBook book={book} />
            </div>

            <div className="mt-3">
              <MarketChat marketId={market.id} />
            </div>

            {error && <p className="mt-3 text-sm text-lose">{error}</p>}

            <button
              onClick={confirm}
              disabled={submitting || amount <= 0 || insufficient}
              className="btn-gold mt-4 w-full disabled:cursor-not-allowed"
            >
              {submitting
                ? "Placing…"
                : insufficient
                  ? "Insufficient Balance"
                  : `Confirm ${paper ? "Paper " : ""}₹${totalCost.toLocaleString("en-IN")}${insured ? " (incl. insurance)" : ""}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
