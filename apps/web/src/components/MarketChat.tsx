import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";

export function MarketChat({ marketId }: { marketId: string }) {
  const { messages, online, send, sending } = useChat(marketId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await send(text);
    setText("");
  }

  return (
    <div className="rounded-xl border border-white/10 bg-dark-800/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gold">💬 Discussion</span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-win animate-pulse-dot" /> {online} online
        </span>
      </div>

      <div className="mb-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">No messages yet — start the conversation.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-xs">
              <span className="font-semibold text-gold">{m.username}</span>
              <span className="ml-1.5 text-[10px] text-gray-600">
                {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="text-gray-300">{m.message}</div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Share your prediction…"
          className="input-dark flex-1 py-2 text-sm"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-gold px-4 py-2 text-sm">
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
