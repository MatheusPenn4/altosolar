"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  tipo: "sucesso" | "erro";
  mensagem: string;
}

const ToastContext = createContext<{ notificar: (tipo: Toast["tipo"], mensagem: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notificar = useCallback((tipo: Toast["tipo"], mensagem: string) => {
    const id = Date.now() + Math.random();
    setToasts((atual) => [...atual, { id, tipo, mensagem }]);
    setTimeout(() => setToasts((atual) => atual.filter((t) => t.id !== id)), 5000);
  }, []);

  const remover = (id: number) => setToasts((atual) => atual.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg",
              t.tipo === "sucesso"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}
          >
            {t.tipo === "sucesso" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{t.mensagem}</span>
            <button onClick={() => remover(t.id)} className="ml-2 opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider.");
  return ctx;
}
