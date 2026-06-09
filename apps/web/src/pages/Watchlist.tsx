import type { MarketType, WatchlistItem } from "@truestake/shared";
import { PageTransition } from "@/components/PageTransition";
import { BookmarkButton } from "@/components/BookmarkButton";
import { usePoll } from "@/hooks/usePoll";

const TYPE_LABEL: Record<MarketType, string> = {
  crypto: "CRYPTO",
  stock: "STOCK",
  ipl: "IPL",
  forex: "FOREX",
  tweet: "TWEET",
};

export default function Watchlist() {
  const { data, loading, refetch } = usePoll<WatchlistItem[]>("/api/watchlist", 60_000);
  const items = data ?? [];

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">WATCHLIST</h1>
      <p className="mb-6 text-sm text-gray-500">Markets you're tracking</p>

      {loading && <div className="text-gray-500">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="glass mt-10 p-10 text-center text-gray-500">
          Nothing bookmarked yet. Tap the ★ on any market to save it here.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="glass flex items-center justify-between border-gold/15 p-5">
            <div className="min-w-0">
              <span className="pill border-gold/30 text-gold">{TYPE_LABEL[item.market_type]}</span>
              <div className="mt-2 truncate font-heading text-xl text-gray-100">
                {item.market_id.split(":")[1] ?? item.market_id}
              </div>
            </div>
            <BookmarkButton
              marketId={item.market_id}
              marketType={item.market_type}
              initial
              watchlistId={item.id}
            />
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <button onClick={refetch} className="btn-ghost mt-6 text-sm">
          Refresh
        </button>
      )}
    </PageTransition>
  );
}
