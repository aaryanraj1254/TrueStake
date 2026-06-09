import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-72 flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-glass backdrop-blur-xl ${STYLES[t.type]}`}
            >
              <span className="mr-2">{ICONS[t.type]}</span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

const STYLES: Record<ToastType, string> = {
  success: "border-win/40 bg-win/10 text-win",
  error: "border-lose/40 bg-lose/10 text-lose",
  info: "border-gold/40 bg-gold/10 text-gold",
};

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ⓘ",
};

export const useToast = () => useContext(Ctx);
