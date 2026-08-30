"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";

export function ListaEditavel({
  itens,
  onChange,
  placeholder,
}: {
  itens: string[];
  onChange: (itens: string[]) => void;
  placeholder?: string;
}) {
  const [novoItem, setNovoItem] = useState("");

  function adicionar() {
    if (!novoItem.trim()) return;
    onChange([...itens, novoItem.trim()]);
    setNovoItem("");
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="flex-1">{item}</span>
          <button type="button" onClick={() => onChange(itens.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={adicionar}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
