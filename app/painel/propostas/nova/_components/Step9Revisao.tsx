"use client";

import { useState } from "react";
import { AlertTriangle, FileDown } from "lucide-react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { centavosParaBRL, somarCentavos } from "@/lib/domain/money";
import { calcularPreco } from "@/lib/domain/precificacao";
import { formatarKwp } from "@/lib/domain/potencia";
import { criarPropostaAction } from "../actions";
import type { CriarPropostaInput } from "@/lib/schemas/proposta";
import type { EstadoWizard } from "./tipos";

export function Step9Revisao({
  estado,
  voltar,
  onConcluir,
}: {
  estado: EstadoWizard;
  voltar: () => void;
  onConcluir: (propostaId: string) => void;
}) {
  const { notificar } = useToast();
  const [gerando, setGerando] = useState(false);
  const [etapaGeracao, setEtapaGeracao] = useState<string>("");

  const valorFabricaCentavos = estado.orcamento?.valores.totalCentavos ?? 0;
  const custosAdicionaisCentavos = somarCentavos(...estado.custosAdicionais.map((c) => c.valorCentavos));
  const preco = calcularPreco({
    valorFabricaCentavos,
    custosAdicionaisCentavos,
    descontoCentavos: estado.descontoCentavos,
    valorFinalManualCentavos: estado.valorFinalManualCentavos,
  });

  const pendencias: string[] = [];
  if (!estado.clienteSelecionado) pendencias.push("Nenhum cliente selecionado.");
  if (estado.equipamentos.length === 0) pendencias.push("Nenhum equipamento informado.");
  if (!estado.condicoesComerciais.formasPagamento?.length) pendencias.push("Nenhuma forma de pagamento informada.");
  if (!estado.dadosTecnicos.potenciaPropostaW) pendencias.push("Potência proposta não informada.");

  async function gerarProposta() {
    if (pendencias.length > 0) {
      notificar("erro", "Corrija as pendências antes de gerar a proposta.");
      return;
    }

    setGerando(true);
    setEtapaGeracao("Criando proposta...");

    const input: CriarPropostaInput = {
      clientId: estado.clienteSelecionado!.id,
      factoryQuoteId: estado.factoryQuoteId,
      equipamentos: estado.equipamentos,
      servicos: estado.servicos,
      garantias: estado.garantias,
      dadosTecnicos: estado.dadosTecnicos as CriarPropostaInput["dadosTecnicos"],
      precificacao: {
        valorFabricaCentavos,
        custosAdicionais: estado.custosAdicionais,
        descontoCentavos: estado.descontoCentavos,
        valorFinalManualCentavos: estado.valorFinalManualCentavos,
        motivoAlteracao: estado.motivoAlteracao,
      },
      condicoesComerciais: estado.condicoesComerciais as CriarPropostaInput["condicoesComerciais"],
      premissasFinanceiras: estado.premissasFinanceiras,
      notas: estado.notas,
    };

    const resultado = await criarPropostaAction(input);

    if (!resultado.sucesso || !resultado.propostaId) {
      notificar("erro", resultado.erro || "Não foi possível criar a proposta.");
      setGerando(false);
      return;
    }

    setEtapaGeracao("Gerando PDF...");

    try {
      const respostaPdf = await fetch(`/api/propostas/${resultado.propostaId}/gerar-pdf`, { method: "POST" });
      const corpoPdf = await respostaPdf.json();
      if (!respostaPdf.ok || !corpoPdf.sucesso) {
        notificar("erro", "Proposta criada, mas houve falha ao gerar o PDF. Tente gerar novamente na página da proposta.");
        onConcluir(resultado.propostaId);
        return;
      }
    } catch {
      notificar("erro", "Proposta criada, mas houve falha ao gerar o PDF. Tente gerar novamente na página da proposta.");
      onConcluir(resultado.propostaId);
      return;
    }

    notificar("sucesso", `Proposta ${resultado.codigo} gerada com sucesso.`);
    onConcluir(resultado.propostaId);
  }

  return (
    <div className="flex flex-col gap-6">
      {pendencias.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Pendências encontradas</p>
              <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                {pendencias.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Resumo da proposta" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Resumo label="Cliente" valor={estado.clienteSelecionado?.nome_razao_social ?? "—"} />
          <Resumo label="Potência proposta" valor={estado.dadosTecnicos.potenciaPropostaW ? formatarKwp(estado.dadosTecnicos.potenciaPropostaW) : "—"} />
          <Resumo label="Equipamentos" valor={`${estado.equipamentos.length} itens`} />
          <Resumo label="Serviços incluídos" valor={`${estado.servicos.filter((s) => s.incluido).length} de ${estado.servicos.length}`} />
          <Resumo label="Formas de pagamento" valor={`${estado.condicoesComerciais.formasPagamento?.length ?? 0}`} />
          <Resumo label="Validade" valor={`${estado.condicoesComerciais.validadeDias ?? "—"} dias`} />
        </div>
      </Card>

      <Card className="border-brand-blue/30 bg-brand-blue/5">
        <p className="text-xs font-medium uppercase text-slate-500">Valor final da proposta</p>
        <p className="text-3xl font-semibold text-slate-900">{centavosParaBRL(preco.valorFinalCentavos)}</p>
        {estado.valorFinalManualCentavos !== null && (
          <p className="mt-1 text-xs text-amber-700">Valor alterado manualmente — motivo: {estado.motivoAlteracao}</p>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar} disabled={gerando}>Voltar</Button>
        <Button onClick={gerarProposta} loading={gerando} size="lg">
          {!gerando && <FileDown className="h-4 w-4" />}
          {gerando ? etapaGeracao : "Gerar proposta em PDF"}
        </Button>
      </div>
    </div>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{valor}</span>
    </div>
  );
}
