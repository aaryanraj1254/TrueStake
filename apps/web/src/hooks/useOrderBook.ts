import type { OrderBook } from "@truestake/shared";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/**
 * Live order book for a market. Fetches the snapshot from the API, then
 * subscribes to that market's realtime UPDATE events (pool/odds changes) so the
 * book refreshes the instant anyone bets — no page refresh. A slow poll backs it
 * up in case Realtime isn't enabled.
 */
export function useOrderBook(marketId: string | null) {
  const [book, setBook] = useState<OrderBook | null>(null);
  const path = marketId ? `/api/markets/orderbook?marketId=${encodeURIComponent(marketId)}` : null;
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!path) {
      setBook(null);
      return;
    }
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchBook = async () => {
      try {
        const b = await api.get<OrderBook>(path);
        if (!cancelled) setBook(b);
        return b;
      } catch {
        return null;
      }
    };

    (async () => {
      const b = await fetchBook();
      if (cancelled || !b) return;
      channel = supabase
        .channel(`orderbook:${b.marketUuid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "markets", filter: `id=eq.${b.marketUuid}` },
          () => void fetchBook(),
        )
        .subscribe();
    })();

    const poll = setInterval(fetchBook, 12_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [path]);

  return book;
}
