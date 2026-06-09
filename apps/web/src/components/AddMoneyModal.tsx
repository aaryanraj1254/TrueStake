import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { fireRedeemConfetti } from "@/lib/confetti";
import { depositMoney } from "@/lib/razorpay";

interface Props {
  open: boolean;
  onClose: () => void;
  onCredited?: () => void;
}

const PRESETS = [100, 500, 1000, 5000];

export function AddMoneyModal({ open, onClose, onCredited }: Props) {
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  async function pay() {
    setBusy(true);
    const result = await depositMoney(amount, {
      email: user?.email,
      name: (user?.user_metadata?.username as string) ?? undefined,
    });
    setBusy(false);

    if (result.status === "success") {
      fireRedeemConfetti();
      toast(`₹${amount.toLocaleString("en-IN")} added to your wallet!`, "success");
      window.dispatchEvent(new Event("truestake:refresh")); // update balances everywhere
      onCredited?.();
      onClose();
    } else if (result.status === "error") {
      toast(result.message ?? "Payment failed", "error");
    }
    // dismissed → silent
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-2xl tracking-wide text-gold-gradient">ADD MONEY</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-200">
                ✕
              </button>
            </div>

            <label className="mb-1 block text-xs uppercase tracking-widest text-gray-400">Amount (₹)</label>
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="input-dark mb-3"
            />
            <div className="mb-5 grid grid-cols-4 gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    amount === v ? "bg-gold-gradient text-dark-900" : "border border-white/10 text-gray-300 hover:border-gold/40"
                  }`}
                >
                  ₹{v}
                </button>
              ))}
            </div>

            <button onClick={pay} disabled={busy || amount < 10} className="btn-gold w-full">
              {busy ? "Opening Razorpay…" : `Pay ₹${amount.toLocaleString("en-IN")}`}
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-500">
              Secured by Razorpay · UPI, cards & netbanking
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
