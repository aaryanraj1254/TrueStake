import type { ChatMessage } from "@truestake/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/**
 * Realtime chat room for a market: loads history, subscribes to new messages
 * via Supabase Realtime, and tracks the online user count with Presence.
 */
export function useChat(marketId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!marketId) return;
    try {
      setMessages(await api.get<ChatMessage[]>(`/api/chat?marketId=${encodeURIComponent(marketId)}`));
    } catch {
      /* ignore */
    }
  }, [marketId]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!marketId) return;
    void load();

    const channel = supabase.channel(`chat:${marketId}`, {
      config: { presence: { key: user?.id ?? Math.random().toString(36) } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "market_chat", filter: `market_id=eq.${marketId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ online_at: Date.now() });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [marketId, load, user?.id]);

  const send = useCallback(
    async (message: string) => {
      if (!marketId || !message.trim()) return;
      setSending(true);
      try {
        // Realtime echoes our own INSERT, so we don't optimistically append.
        await api.post("/api/chat", { marketId, message });
      } finally {
        setSending(false);
      }
    },
    [marketId],
  );

  return { messages, online, send, sending };
}
