"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Lock, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Input, TextArea, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { brlParaCentavos, centavosParaBRL, somarCentavos } from "@/lib/domain/money";
import { calcularPreco, validarAlteracaoManual } from "@/lib/domain/precificacao";
import type { EstadoWizard } from "./tipos";

export function Step6Precificacao({
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
  const { notificar } = useToast();
  const [alterandoValor, setAlterandoValor] = useState(estado.valorFinalManualCentavos !== null);

  const valorFabricaCentavos = estado.orcamento?.valores.totalCentavos ?? 0;

  const custosAdicionaisCentavos = useMemo(
    () => somarCentavos(...estado.custosAdicionais.map((c) => c.valorCentavos)),
    [estado.custosAdicionais]
  );

  const preco = useMemo(
    () =>
      calcularPreco({
        valorFabricaCentavos,
        custosAdicionaisCentavos,
        descontoCentavos: estado.descontoCentavos,
        valorFinalManualCentavos: alterandoValor ? estado.valorFinalManualCentavos : null,
      }),
    [valorFabricaCentavos, custosAdicionaisCentavos, estado.descontoCentavos, estado.valorFinalManualCentavos, alterandoValor]
  );

  function adicionarCusto() {
    atualizar({ custosAdicionais: [...estado.custosAdicionais, { descricao: "", valorCentavos: 0 }] });
  }

  function atualizarCusto(indice: number, campo: "descricao" | "valorCentavos", valor: string) {
    const copia = [...estado.custosAdicionais];
    copia[indice] = {
      ...copia[indice],
      [campo]: campo === "valorCentavos" ? (tentarConverter(valor) ?? copia[indice].valorCentavos) : valor,
    };
    atualizar({ custosAdicionais: copia });
  }

  function removerCusto(indice: number) {
    atualizar({ custosAdicionais: estado.custosAdicionais.filter((_, i) => i !== indice) });
  }

  function continuar() {
    if (alterandoValor) {
      const erros = validarAlteracaoManual(estado.motivoAlteracao, estado.valorFinalManualCentavos ?? 0);
      if (erros.length > 0) {
        notificar("erro", erros[0]);
        return;
      }
    }
    avancar();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-slate-300 bg-slate-50">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Estas informações são internas e nunca aparecem na proposta enviada ao cliente.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica label="Valor da fábrica" valor={centavosParaBRL(valorFabricaCentavos)} />
          <Metrica label="Custo total" valor={centavosParaBRL(preco.custoTotalCentavos)} />
          <Metrica label="Lucro bruto" valor={centavosParaBRL(preco.lucroBrutoCentavos)} negativo={preco.lucroBrutoCentavos < 0} />
          <Metrica label="Margem" valor={`${preco.margemPercentual.toFixed(1)}%`} negativo={preco.margemPercentual < 0} />
        </div>
        {preco.abaixoDoCusto && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            O valor final está abaixo do custo total. Revise antes de prosseguir.
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Custos adicionais"
          description="Opcionais — instalação, projeto, materiais, deslocamento, comissão, impostos, imprevistos."
          action={
            <Button type="button" variant="outline" size="sm" onClick={adicionarCusto}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar custo
            </Button>
          }
        />
        <div className="flex flex-col gap-2">
          {estado.custosAdicionais.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Descrição" value={c.descricao} onChange={(e) => atualizarCusto(i, "descricao", e.target.value)} className="flex-1" />
              <Input
                placeholder="R$ 0,00"
                defaultValue={c.valorCentavos ? (c.valorCentavos / 100).toFixed(2) : ""}
                onChange={(e) => atualizarCusto(i, "valorCentavos", e.target.value)}
                className="w-36"
              />
              <button type="button" onClick={() => removerCusto(i)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {estado.custosAdicionais.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">Nenhum custo adicional informado.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Desconto" />
        <FieldWrapper label="Valor do desconto (R$)">
          <Input
            placeholder="0,00"
            defaultValue={estado.descontoCentavos ? (estado.descontoCentavos / 100).toFixed(2) : ""}
            onChange={(e) => {
              const centavos = tentarConverter(e.target.value);
              if (centavos !== null) atualizar({ descontoCentavos: centavos });
            }}
          />
        </FieldWrapper>
      </Card>

      <Card>
        <CardHeader title="Valor final da proposta" description="Por padrão, é o valor total extraído do orçamento da fábrica." />

        <div className="mb-4 rounded-lg bg-brand-blue/5 p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Valor final (o cliente verá este valor)</p>
          <p className="text-2xl font-semibold text-slate-900">{centavosParaBRL(preco.valorFinalCentavos)}</p>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={alterandoValor}
            onChange={(e) => {
              setAlterandoValor(e.target.checked);
              if (!e.target.checked) atualizar({ valorFinalManualCentavos: null, motivoAlteracao: "" });
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
          />
          Alterar valor da proposta manualmente
        </label>

        {alterandoValor && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4">
            <FieldWrapper label="Novo valor final (R$)" required>
              <Input
                placeholder="0,00"
                defaultValue={estado.valorFinalManualCentavos ? (estado.valorFinalManualCentavos / 100).toFixed(2) : ""}
                onChange={(e) => {
                  const centavos = tentarConverter(e.target.value);
                  atualizar({ valorFinalManualCentavos: centavos });
                }}
              />
            </FieldWrapper>
            <FieldWrapper label="Justificativa da alteração" required>
              <TextArea
                value={estado.motivoAlteracao}
                onChange={(e) => atualizar({ motivoAlteracao: e.target.value })}
                placeholder="Ex.: negociação comercial, condição especial de pagamento..."
              />
            </FieldWrapper>
            <p className="text-xs text-slate-500">
              Esta alteração será registrada com seu usuário, data, valor anterior e valor novo.
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={continuar}>Continuar</Button>
      </div>
    </div>
  );
}

function tentarConverter(valor: string): number | null {
  try {
    return brlParaCentavos(valor);
  } catch {
    return null;
  }
}

function Metrica({ label, valor, negativo }: { label: string; valor: string; negativo?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${negativo ? "text-red-600" : "text-slate-800"}`}>{valor}</p>
    </div>
  );
}
