import type { CryptoTicker, ForexRate, IplMatch, StockTicker } from "@truestake/shared";
import type { MarketView } from "@/components/MarketCard";

// Deterministic pseudo-random so odds/participants stay stable per id between polls.
function seeded(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const expiry = (mins: number) => new Date(Date.now() + mins * 60_000).toISOString();

export function cryptoToViews(data: CryptoTicker[]): MarketView[] {
  return data.map((c) => ({
    id: `crypto:${c.id}`,
    type: "crypto",
    title: c.name,
    subtitle: c.symbol.toUpperCase(),
    price: c.price,
    change: c.change24h,
    odds: 1.6 + seeded(c.id) * 1.4,
    participants: 200 + Math.floor(seeded(c.id) * 5000),
    expiresAt: expiry(2), // short window so bets auto-settle within minutes
  }));
}

export function stocksToViews(data: StockTicker[]): MarketView[] {
  return data.map((s) => ({
    id: `stock:${s.ticker}`,
    type: "stock",
    title: s.ticker,
    subtitle: "NSE",
    price: s.price,
    change: Number(String(s.change_percentage).replace("%", "")) || 0,
    odds: 1.7 + seeded(s.ticker) * 1.3,
    participants: 100 + Math.floor(seeded(s.ticker) * 3000),
    expiresAt: expiry(120),
  }));
}

export function forexToViews(data: ForexRate): MarketView[] {
  const pairs = ["INR", "EUR", "GBP", "JPY", "AUD", "CAD"];
  return pairs
    .filter((p) => data.rates[p] !== undefined)
    .map((p) => ({
      id: `forex:USD${p}`,
      type: "forex" as const,
      title: `USD/${p}`,
      subtitle: "Forex",
      price: data.rates[p]!,
      change: (seeded(p) - 0.5) * 2,
      odds: 1.8 + seeded(p),
      participants: 50 + Math.floor(seeded(p) * 1500),
      expiresAt: expiry(240),
    }));
}

export function iplToViews(data: IplMatch[]): MarketView[] {
  return data.map((m) => ({
    id: `ipl:${m.id}`,
    type: "ipl",
    title: m.name,
    subtitle: m.status,
    odds: 1.9 + seeded(m.id),
    participants: 1000 + Math.floor(seeded(m.id) * 20000),
    expiresAt: expiry(180),
  }));
}
