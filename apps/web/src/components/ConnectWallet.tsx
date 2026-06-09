import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useMetaMask } from "@/hooks/useMetaMask";
import { MetaMaskIcon } from "./icons/MetaMaskIcon";

const CHAIN_NAMES: Record<string, string> = {
  "0x1": "Ethereum",
  "0xaa36a7": "Sepolia",
  "0x5": "Goerli",
  "0x89": "Polygon",
  "0x13881": "Mumbai",
  "0xa": "Optimism",
  "0xa4b1": "Arbitrum",
  "0x2105": "Base",
};

export function ConnectWallet() {
  const { address, short, balance, chainId, connect, disconnect, connecting, hasMetaMask, error } = useMetaMask();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ── Not installed: branded install button ──
  if (!hasMetaMask) {
    return (
      <div className="relative" ref={ref}>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-gold/40"
          title="MetaMask not detected — click to install"
        >
          <MetaMaskIcon className="h-4 w-4" />
          Install MetaMask
        </a>
        <ErrorToast error={error} />
      </div>
    );
  }

  // ── Not connected: connect button with fox ──
  if (!address) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={connect}
          disabled={connecting}
          className="flex items-center gap-2 rounded-lg bg-gold-gradient px-3 py-1.5 text-xs font-semibold text-dark-900 shadow-gold transition hover:shadow-gold-lg disabled:opacity-60"
        >
          <MetaMaskIcon className="h-4 w-4" />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
        <ErrorToast error={error} />
      </div>
    );
  }

  // ── Connected: pill + full wallet dropdown ──
  const network = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${parseInt(chainId, 16)}`) : "Unknown";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gold/30 bg-dark-700/80 px-3 py-1.5 shadow-gold transition hover:border-gold/60"
      >
        <MetaMaskIcon className="h-4 w-4" />
        <span className="h-2 w-2 rounded-full bg-win animate-pulse-dot" />
        <span className="font-mono text-xs text-gold">{short}</span>
        {balance !== null && <span className="hidden text-xs text-gray-400 sm:inline">{balance} ETH</span>}
        <span className="text-[10px] text-gray-500">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-gold/20 bg-dark-800 shadow-glass"
          >
            <div className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-br from-gold/10 to-transparent p-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-dark-700">
                <MetaMaskIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-sm text-gold">{short}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-win" /> Connected · {network}
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-lg border border-white/10 bg-dark-700/60 p-3">
                <div className="text-[11px] uppercase tracking-widest text-gray-500">Balance</div>
                <div className="font-heading text-2xl text-gold-gradient">{balance ?? "—"} ETH</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (address) navigator.clipboard.writeText(address);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="btn-ghost py-2 text-xs"
                >
                  {copied ? "Copied! ✓" : "Copy Address"}
                </button>
                <a
                  href={`https://etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost py-2 text-center text-xs"
                >
                  Explorer ↗
                </a>
              </div>

              <button
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg border border-lose/40 bg-lose/10 py-2 text-xs font-semibold text-lose transition hover:bg-lose/20"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorToast error={error} />
    </div>
  );
}

function ErrorToast({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-lose/40 bg-dark-800 px-3 py-2 text-xs text-lose shadow-lg"
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
