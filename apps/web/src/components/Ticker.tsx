import type { CryptoTicker } from "@truestake/shared";
import { usePoll } from "@/hooks/usePoll";

// Scrolling live price strip — crypto feed (extendable to stocks/IPL).
export function Ticker() {
  const { data } = usePoll<CryptoTicker[]>("/api/live/crypto", 30_000);

  const items = data ?? FALLBACK;
  const doubled = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden border-y border-gold/10 bg-dark-800/60 py-2 backdrop-blur">
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {doubled.map((c, i) => (
          <span key={`${c.symbol}-${i}`} className="flex items-center gap-2 font-body text-sm">
            <span className="font-semibold uppercase text-gray-300">{c.symbol}</span>
            <span className="text-gray-100">₹{c.price.toLocaleString("en-IN")}</span>
            <span className={c.change24h >= 0 ? "text-win" : "text-lose"}>
              {c.change24h >= 0 ? "▲" : "▼"} {Math.abs(c.change24h).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

const FALLBACK: CryptoTicker[] = [
  { id: "btc", symbol: "btc", name: "Bitcoin", image: "", price: 8_120_000, change24h: 2.4 },
  { id: "eth", symbol: "eth", name: "Ethereum", image: "", price: 280_000, change24h: -1.1 },
  { id: "sol", symbol: "sol", name: "Solana", image: "", price: 14_500, change24h: 5.6 },
  { id: "bnb", symbol: "bnb", name: "BNB", image: "", price: 52_000, change24h: 0.8 },
];
