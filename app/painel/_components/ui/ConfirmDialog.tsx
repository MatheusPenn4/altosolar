"use client";

import { Button } from "./Button";

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  tom = "primary",
  onConfirmar,
  onCancelar,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tom?: "primary" | "danger";
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
        {descricao && <p className="mt-2 text-sm text-slate-500">{descricao}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancelar}>
            {textoCancelar}
          </Button>
          <Button variant={tom === "danger" ? "danger" : "primary"} onClick={onConfirmar}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
