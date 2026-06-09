import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { enablePush, pushSupported } from "@/lib/push";
import type { MarketView } from "./MarketCard";

export function SetAlertModal({
  market,
  open,
  onClose,
}: {
  market: MarketView;
  open: boolean;
  onClose: () => void;
}) {
  const current = market.price ?? 0;
  const [target, setTarget] = useState(current);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const symbol = market.id.split(":").slice(1).join(":");

  async function submit() {
    setBusy(true);
    try {
      // Best-effort: enable browser push so the alert can notify even off-page.
      if (pushSupported()) {
        const r = await enablePush();
        if (!r.ok && r.message) toast(r.message, "info");
      }
      await api.post("/api/alerts", {
        marketType: market.type,
        marketId: market.id,
        symbol,
        title: market.title,
        targetPrice: target,
        direction,
      });
      toast(`Alert set: ${market.title} ${direction} ₹${target.toLocaleString("en-IN")}`, "success");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to set alert", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-gold w-full max-w-sm p-6"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-2xl tracking-wide text-gold-gradient">🔔 SET ALERT</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-200">
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              {market.title} · current ₹{current.toLocaleString("en-IN")}
            </p>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection("above")}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                  direction === "above" ? "border-win/50 bg-win/10 text-win" : "border-white/10 text-gray-300"
                }`}
              >
                ▲ Rises above
              </button>
              <button
                onClick={() => setDirection("below")}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                  direction === "below" ? "border-lose/50 bg-lose/10 text-lose" : "border-white/10 text-gray-300"
                }`}
              >
                ▼ Falls below
              </button>
            </div>

            <label className="mb-1 block text-xs uppercase tracking-widest text-gray-400">Target price (₹)</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(Math.max(0, Number(e.target.value)))}
              className="input-dark mb-4"
            />

            <button onClick={submit} disabled={busy || target <= 0} className="btn-gold w-full">
              {busy ? "Setting…" : "Create Alert"}
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-500">Notified via browser push + email when hit.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
