import { REDEEM_RATE, REDEEM_VALUE } from "@truestake/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/lib/api";
import { fireRedeemConfetti } from "@/lib/confetti";

const PLATFORMS = [
  { name: "Flipkart", color: "from-blue-500 to-blue-700" },
  { name: "Amazon", color: "from-orange-400 to-orange-600" },
  { name: "Myntra", color: "from-pink-500 to-pink-700" },
  { name: "Ajio", color: "from-gray-700 to-black" },
  { name: "Dream11", color: "from-red-500 to-red-700" },
  { name: "MPL", color: "from-purple-500 to-purple-700" },
];

interface Voucher {
  voucherCode: string;
  platform: string;
  rupees: number;
}

export default function Redeem() {
  const { data: wallet, refetch } = usePoll<{ supercoins: number }>("/api/wallet", 30_000);
  const coins = wallet?.supercoins ?? 0;

  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(REDEEM_RATE);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem(platform: string) {
    if (coins < REDEEM_RATE) {
      setError(`You need at least ${REDEEM_RATE} SuperCoins to redeem.`);
      return;
    }
    setSelected(platform);
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<Voucher>("/api/wallet/redeem", {
        platform,
        coinsToRedeem: amount,
      });
      setVoucher(result);
      fireRedeemConfetti();
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redemption failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">REDEEM</h1>
      <p className="mb-6 text-sm text-gray-500">
        {REDEEM_RATE} SuperCoins = ₹{REDEEM_VALUE} voucher
      </p>

      {/* Coin balance */}
      <div className="glass-gold shimmer mb-8 flex items-center gap-5 p-6">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gold-gradient text-4xl text-dark-900 shadow-gold-lg animate-flip-coin">
          ◉
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400">SuperCoin Balance</div>
          <div className="font-heading text-5xl text-gold-gradient">{coins.toLocaleString("en-IN")}</div>
          <div className="text-sm text-gray-500">
            ≈ ₹{((coins / REDEEM_RATE) * REDEEM_VALUE).toLocaleString("en-IN")} redeemable
          </div>
        </div>
      </div>

      {/* Amount selector */}
      <div className="glass mb-6 flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-gray-400">Coins to redeem:</span>
        {[100, 500, 1000, 2000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            disabled={v > coins}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-30 ${
              amount === v ? "bg-gold-gradient text-dark-900" : "border border-white/10 text-gray-300 hover:border-gold/40"
            }`}
          >
            {v}
          </button>
        ))}
        <span className="ml-auto text-sm text-gold">
          → ₹{((amount / REDEEM_RATE) * REDEEM_VALUE).toLocaleString("en-IN")}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-lose">{error}</p>}

      {/* Platform cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {PLATFORMS.map((p) => (
          <motion.button
            key={p.name}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy && selected === p.name}
            onClick={() => redeem(p.name)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.color} p-6 text-left shadow-glass transition`}
          >
            <div className="font-heading text-2xl tracking-wide text-white">{p.name}</div>
            <div className="mt-1 text-sm text-white/80">Redeem voucher</div>
            <div className="mt-4 inline-flex rounded-lg bg-black/30 px-3 py-1 text-xs font-semibold text-white">
              {busy && selected === p.name ? "Generating…" : `${amount} coins`}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Voucher modal */}
      <AnimatePresence>
        {voucher && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVoucher(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="glass-gold w-full max-w-sm p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl">🎉</div>
              <h2 className="mt-3 font-heading text-3xl tracking-wide text-gold-gradient">VOUCHER UNLOCKED</h2>
              <p className="text-sm text-gray-400">
                ₹{voucher.rupees} {voucher.platform} voucher
              </p>
              <div className="mt-5 rounded-xl border border-dashed border-gold/50 bg-dark-800 p-4 font-mono text-lg tracking-widest text-gold">
                {voucher.voucherCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(voucher.voucherCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="btn-gold mt-4 w-full"
              >
                {copied ? "Copied! ✓" : "Copy Code"}
              </button>
              <button onClick={() => setVoucher(null)} className="mt-2 text-sm text-gray-500 hover:text-gray-300">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
