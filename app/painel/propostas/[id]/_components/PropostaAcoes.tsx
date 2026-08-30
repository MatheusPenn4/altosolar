"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { alterarStatusPropostaAction } from "../actions";
import type { StatusProposta } from "@/lib/supabase/types";

export function PropostaAcoes({
  propostaId,
  statusAtual,
  temVersoes,
}: {
  propostaId: string;
  statusAtual: StatusProposta;
  temVersoes: boolean;
}) {
  const router = useRouter();
  const { notificar } = useToast();
  const [gerando, setGerando] = useState(false);
  const [mudandoStatus, setMudandoStatus] = useState(false);

  async function gerarNovaVersao() {
    setGerando(true);
    try {
      const resposta = await fetch(`/api/propostas/${propostaId}/gerar-pdf`, { method: "POST" });
      const corpo = await resposta.json();
      if (!resposta.ok || !corpo.sucesso) {
        notificar("erro", corpo.erro || "Falha ao gerar o PDF.");
        return;
      }
      notificar("sucesso", `Versão ${corpo.versionNumber} gerada com sucesso.`);
      router.refresh();
    } catch {
      notificar("erro", "Falha inesperada ao gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  async function mudarStatus(novoStatus: StatusProposta) {
    setMudandoStatus(true);
    const resultado = await alterarStatusPropostaAction(propostaId, novoStatus);
    setMudandoStatus(false);
    if (!resultado.sucesso) {
      notificar("erro", resultado.erro || "Não foi possível alterar o status.");
      return;
    }
    notificar("sucesso", "Status atualizado.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={gerarNovaVersao} loading={gerando}>
        <FileDown className="h-4 w-4" />
        {temVersoes ? "Gerar nova versão" : "Gerar PDF"}
      </Button>

      {statusAtual === "ready" && (
        <Button onClick={() => mudarStatus("sent")} loading={mudandoStatus}>
          <Send className="h-4 w-4" />
          Marcar como enviada
        </Button>
      )}
      {statusAtual === "sent" && (
        <>
          <Button variant="primary" onClick={() => mudarStatus("accepted")} loading={mudandoStatus}>
            <CheckCircle2 className="h-4 w-4" />
            Aceita
          </Button>
          <Button variant="danger" onClick={() => mudarStatus("rejected")} loading={mudandoStatus}>
            <XCircle className="h-4 w-4" />
            Recusada
          </Button>
        </>
      )}
    </div>
  );
}
