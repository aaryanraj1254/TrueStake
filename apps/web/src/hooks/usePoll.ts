import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PollState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Polls a GET endpoint every `intervalMs`. Used for the 30s/60s live feeds.
export function usePoll<T>(path: string, intervalMs: number): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<T>(path);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    // Allow any component to force an immediate refresh of all polls
    // (e.g. after a deposit credits the wallet).
    const onRefresh = () => load();
    window.addEventListener("truestake:refresh", onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("truestake:refresh", onRefresh);
    };
  }, [load, intervalMs]);

  return { data, loading, error, refetch: load };
}
