import type { MarketType } from "@truestake/shared";
import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  marketId: string;
  marketType: MarketType;
  initial?: boolean;
  watchlistId?: string;
}

// Gold filled/outline bookmark toggle used on every market card.
export function BookmarkButton({ marketId, marketType, initial = false, watchlistId }: Props) {
  const [saved, setSaved] = useState(initial);
  const [id, setId] = useState<string | undefined>(watchlistId);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (saved && id) {
        await api.del(`/api/watchlist/${id}`);
        setSaved(false);
        setId(undefined);
      } else {
        const item = await api.post<{ id: string }>("/api/watchlist", { marketId, marketType });
        setSaved(true);
        setId(item.id);
      }
    } catch {
      /* swallow — UI stays in prior state */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      title={saved ? "Remove from watchlist" : "Add to watchlist"}
      className={`text-lg transition ${saved ? "text-gold" : "text-gray-500 hover:text-gold"}`}
      aria-pressed={saved}
    >
      {saved ? "★" : "☆"}
    </button>
  );
}
