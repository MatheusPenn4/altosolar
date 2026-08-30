"use client";

import { useMemo } from "react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Input, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { centavosParaBRL } from "@/lib/domain/money";
import { calcularPreco } from "@/lib/domain/precificacao";
import { simular } from "@/lib/domain/simulacao";
import { somarCentavos } from "@/lib/domain/money";
import type { EstadoWizard } from "./tipos";

export function Step8Simulacao({
  estado,
  atualizar,
  avancar,
  voltar,
}: {
  estado: EstadoWizard;
  atualizar: (parcial: Partial<EstadoWizard>) => void;
  avancar: () => void;
  voltar: () => void;
}) {
  const pf = estado.premissasFinanceiras;

  const valorFabricaCentavos = estado.orcamento?.valores.totalCentavos ?? 0;
  const custosAdicionaisCentavos = somarCentavos(...estado.custosAdicionais.map((c) => c.valorCentavos));
  const preco = calcularPreco({
    valorFabricaCentavos,
    custosAdicionaisCentavos,
    descontoCentavos: estado.descontoCentavos,
    valorFinalManualCentavos: estado.valorFinalManualCentavos,
  });

  const podeSimular = !!(estado.dadosTecnicos.tarifaCentavosKwh && estado.dadosTecnicos.geracaoMensalKwh && estado.dadosTecnicos.consumoMedioKwh);

  const resultado = useMemo(() => {
    if (!podeSimular) return null;
    return simular({
      tarifaCentavosKwh: estado.dadosTecnicos.tarifaCentavosKwh!,
      geracaoMensalKwh: estado.dadosTecnicos.geracaoMensalKwh!,
      consumoMedioMensalKwh: estado.dadosTecnicos.consumoMedioKwh!,
      valorFinalCentavos: preco.valorFinalCentavos,
      reajusteAnualPercentual: pf.reajusteAnualPercentual,
      degradacaoAnualPercentual: pf.degradacaoAnualPercentual,
      anosProjecao: pf.anosProjecao,
    });
  }, [podeSimular, estado.dadosTecnicos, preco.valorFinalCentavos, pf]);

  function set<K extends keyof typeof pf>(campo: K, valor: (typeof pf)[K]) {
    atualizar({ premissasFinanceiras: { ...pf, [campo]: valor } });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Premissas financeiras" description="Usadas apenas para a projeção — nunca inventadas automaticamente." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="Reajuste anual da tarifa (%)">
            <Input type="number" step="0.1" value={pf.reajusteAnualPercentual ?? ""} onChange={(e) => set("reajusteAnualPercentual", e.target.value ? Number(e.target.value) : undefined)} />
          </FieldWrapper>
          <FieldWrapper label="Degradação anual dos módulos (%)">
            <Input type="number" step="0.1" value={pf.degradacaoAnualPercentual ?? ""} onChange={(e) => set("degradacaoAnualPercentual", e.target.value ? Number(e.target.value) : undefined)} />
          </FieldWrapper>
          <FieldWrapper label="Anos de projeção (máx. 25)">
            <Input type="number" min={0} max={25} value={pf.anosProjecao ?? ""} onChange={(e) => set("anosProjecao", e.target.value ? Number(e.target.value) : undefined)} />
          </FieldWrapper>
        </div>
      </Card>

      {!podeSimular && (
        <Card>
          <p className="text-sm text-slate-500">
            Preencha tarifa, geração mensal e consumo médio na etapa de Projeto para visualizar a simulação.
          </p>
        </Card>
      )}

      {resultado && (
        <>
          <Card>
            <CardHeader title="Resultado da simulação" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metrica label="Economia mensal" valor={centavosParaBRL(resultado.economiaMensalCentavos)} />
              <Metrica label="Economia no 1º ano" valor={centavosParaBRL(resultado.economiaPrimeiroAnoCentavos)} />
              <Metrica label="Payback simples" valor={resultado.paybackMeses ? `${resultado.paybackMeses} meses` : "—"} />
            </div>
          </Card>

          {resultado.projecaoAnual.length > 0 && (
            <Card>
              <CardHeader title={`Projeção de ${pf.anosProjecao} anos`} />
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-2">Ano</th>
                      <th className="py-2 text-right">Economia no ano</th>
                      <th className="py-2 text-right">Acumulada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.projecaoAnual.map((p) => (
                      <tr key={p.ano} className="border-b border-slate-100">
                        <td className="py-1.5">{p.ano}</td>
                        <td className="py-1.5 text-right">{centavosParaBRL(p.economiaAnualCentavos)}</td>
                        <td className="py-1.5 text-right font-medium">{centavosParaBRL(p.economiaAcumuladaCentavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={avancar}>Continuar</Button>
      </div>
    </div>
  );
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{valor}</p>
    </div>
  );
}
