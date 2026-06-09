import type { AiPrediction } from "@truestake/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { MarketView } from "./MarketCard";

const STYLE: Record<AiPrediction["prediction"], { label: string; cls: string }> = {
  up: { label: "▲ UP", cls: "text-win" },
  down: { label: "▼ DOWN", cls: "text-lose" },
  neutral: { label: "◆ NEUTRAL", cls: "text-gold" },
};

export function AskAI({ market }: { market: MarketView }) {
  const [result, setResult] = useState<AiPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function ask() {
    setLoading(true);
    try {
      const r = await api.post<AiPrediction>("/api/ai/predict", {
        marketId: market.id,
        marketType: market.type,
        symbol: market.id.split(":").slice(1).join(":"),
        title: market.title,
        price: market.price,
        change: market.change,
      });
      setResult(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : "AI request failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const meta = result ? STYLE[result.prediction] : null;

  return (
    <div>
      <button
        onClick={ask}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent py-2.5 text-sm font-semibold text-gold transition hover:border-gold/60"
      >
        ✨ {loading ? "Claude is analysing…" : "Ask AI for a prediction"}
      </button>

      <AnimatePresence>
        {result && meta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-xl border border-gold/20 bg-dark-800/80 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-gray-500">AI call</span>
              <span className={`font-heading text-lg ${meta.cls}`}>{meta.label}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Confidence</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-dark-600">
                <motion.div
                  className="h-full bg-gold-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gold">{Math.round(result.confidence)}%</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-300">{result.reasoning}</p>
            <p className="mt-1 text-[10px] text-gray-600">AI analysis · not financial advice</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
