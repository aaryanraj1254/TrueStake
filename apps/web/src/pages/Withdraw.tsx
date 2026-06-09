import type { Withdrawal, WithdrawalMethod, WithdrawalStatus } from "@truestake/shared";
import { useState } from "react";
import { MetaMaskIcon } from "@/components/icons/MetaMaskIcon";
import { PageTransition } from "@/components/PageTransition";
import { useMetaMask } from "@/hooks/useMetaMask";
import { usePoll } from "@/hooks/usePoll";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";

const STATUS_STYLE: Record<WithdrawalStatus, string> = {
  pending: "border-gold/40 text-gold",
  approved: "border-win/40 text-win",
  rejected: "border-lose/40 text-lose",
};

export default function Withdraw() {
  const { data: wallet } = usePoll<{ balance: number }>("/api/wallet", 30_000);
  const { data: history, refetch } = usePoll<Withdrawal[]>("/api/withdrawals", 30_000);
  const { address, short, connect, hasMetaMask } = useMetaMask();
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState<WithdrawalMethod>("bank");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const balance = wallet?.balance ?? 0;
  const insufficient = amount > balance;
  const needsWallet = method === "metamask" && !address;

  async function submit() {
    if (insufficient) {
      toast("Insufficient balance for this withdrawal", "error");
      return;
    }
    if (method === "metamask" && !address) {
      toast("Connect your MetaMask wallet first", "error");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/withdrawals", {
        amount,
        method,
        destination: method === "metamask" ? address : undefined,
      });
      toast(`Withdrawal request for ₹${amount.toLocaleString("en-IN")} submitted`, "success");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Request failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">WITHDRAW FUNDS</h1>
      <p className="mb-6 text-sm text-gray-500">Requests are reviewed by an admin before payout</p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request form */}
        <div className="glass-gold p-6">
          <div className="mb-4 text-sm text-gray-400">
            Available: <span className="font-semibold text-gold">₹{balance.toLocaleString("en-IN")}</span>
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
            {[500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                disabled={v > balance}
                className={`rounded-lg py-2 text-xs font-semibold transition disabled:opacity-30 ${
                  amount === v ? "bg-gold-gradient text-dark-900" : "border border-white/10 text-gray-300 hover:border-gold/40"
                }`}
              >
                ₹{v}
              </button>
            ))}
          </div>

          {/* Payout method */}
          <label className="mb-1 block text-xs uppercase tracking-widest text-gray-400">Payout method</label>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("bank")}
              className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                method === "bank" ? "border-gold bg-gold/10 text-gold" : "border-white/10 text-gray-300 hover:border-gold/40"
              }`}
            >
              🏦 Bank
            </button>
            <button
              onClick={() => setMethod("metamask")}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition ${
                method === "metamask" ? "border-gold bg-gold/10 text-gold" : "border-white/10 text-gray-300 hover:border-gold/40"
              }`}
            >
              <MetaMaskIcon className="h-4 w-4" /> MetaMask
            </button>
          </div>

          {method === "metamask" && (
            <div className="mb-4 rounded-lg border border-white/10 bg-dark-800/60 p-3 text-xs">
              {address ? (
                <span className="text-gray-300">
                  Payout to <span className="font-mono text-gold">{short}</span>
                </span>
              ) : hasMetaMask ? (
                <button onClick={connect} className="text-gold hover:underline">
                  Connect MetaMask to set the destination address →
                </button>
              ) : (
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-gold hover:underline">
                  MetaMask not detected — install it →
                </a>
              )}
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy || amount < 10 || insufficient || needsWallet}
            className="btn-gold w-full disabled:cursor-not-allowed"
          >
            {insufficient
              ? "Insufficient Balance"
              : needsWallet
                ? "Connect MetaMask First"
                : busy
                  ? "Submitting…"
                  : "Request Withdrawal"}
          </button>
          <p className="mt-3 text-center text-[11px] text-gray-500">
            Balance is deducted only after an admin approves your request.
          </p>
        </div>

        {/* Request history */}
        <div className="glass p-6">
          <h2 className="mb-4 font-heading text-xl tracking-wide text-gray-100">YOUR REQUESTS</h2>
          {(history ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No withdrawal requests yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {(history ?? []).map((w) => (
                <div key={w.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-mono text-sm text-gray-200">₹{Number(w.amount).toLocaleString("en-IN")}</div>
                    <div className="text-xs text-gray-500">
                      {w.method === "metamask" ? "🦊 MetaMask" : "🏦 Bank"} ·{" "}
                      {new Date(w.requested_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    {w.destination && <div className="font-mono text-[11px] text-gray-600">{w.destination}</div>}
                    {w.note && <div className="text-xs text-lose">Note: {w.note}</div>}
                  </div>
                  <span className={`pill ${STATUS_STYLE[w.status]}`}>{w.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
