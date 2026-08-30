"use client";

import { useEffect, useState } from "react";

/** Formata um instante ISO no fuso horário do navegador — evita depender do fuso do servidor. */
export function HorarioLocal({ iso }: { iso: string }) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    setTexto(new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));
  }, [iso]);

  return <>{texto ?? "—"}</>;
}
