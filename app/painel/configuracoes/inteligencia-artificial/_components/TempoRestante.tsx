"use client";

import { useEffect, useState } from "react";

/**
 * Mostra o tempo até `iso` (ex.: "2h 34min") ou a data completa quando já
 * passa de um dia. Client-only para evitar mismatch de fuso entre servidor e
 * navegador, mesmo padrão de HorarioLocal.tsx.
 *
 * `confiavel = false` significa que o provider não informou um horário de
 * reset real — nesse caso não inventamos um horário, mostramos isso de forma
 * explícita.
 */
export function TempoRestante({ iso, confiavel }: { iso: string | null; confiavel: boolean }) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) {
      setTexto(null);
      return;
    }
    const alvo = new Date(iso).getTime();
    const diffMs = alvo - Date.now();

    if (diffMs <= 0) {
      setTexto("Disponível novamente em instantes.");
      return;
    }

    const totalMin = Math.ceil(diffMs / 60_000);
    if (totalMin < 24 * 60) {
      const horas = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      setTexto(horas > 0 ? `${horas}h ${min}min` : `${min}min`);
    } else {
      setTexto(new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));
    }
  }, [iso]);

  if (!iso) return null;

  if (!confiavel) {
    return (
      <p className="text-xs text-slate-500">
        Cooldown interno da aplicação — tempo de liberação não informado pelo provider.
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-500">
      Disponível novamente em: <span className="font-medium text-slate-700">{texto ?? "—"}</span>
    </p>
  );
}
