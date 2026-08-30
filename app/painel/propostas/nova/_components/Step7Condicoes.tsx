"use client";

import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Input, Select, TextArea, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { brlParaCentavos } from "@/lib/domain/money";
import type { FormaPagamento } from "@/lib/schemas/proposta";
import type { EstadoWizard } from "./tipos";
import { ListaEditavel } from "./ListaEditavel";

const LABEL_TIPO_PAGAMENTO: Record<FormaPagamento["tipo"], string> = {
  a_vista: "À vista",
  entrada_parcelas: "Entrada + parcelas",
  financiamento: "Financiamento",
};

export function Step7Condicoes({
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
  const cc = estado.condicoesComerciais;
  const formas = cc.formasPagamento ?? [];

  function setCC(parcial: Partial<typeof cc>) {
    atualizar({ condicoesComerciais: { ...cc, ...parcial } });
  }

  function adicionarForma() {
    setCC({ formasPagamento: [...formas, { tipo: "a_vista", descricao: "" }] });
  }

  function atualizarForma(indice: number, parcial: Partial<FormaPagamento>) {
    const copia = [...formas];
    copia[indice] = { ...copia[indice], ...parcial };
    setCC({ formasPagamento: copia });
  }

  function removerForma(indice: number) {
    setCC({ formasPagamento: formas.filter((_, i) => i !== indice) });
  }

  function continuar() {
    if (formas.length === 0) {
      notificar("erro", "Adicione ao menos uma forma de pagamento.");
      return;
    }
    if (!cc.validadeDias || cc.validadeDias <= 0) {
      notificar("erro", "Informe a validade da proposta em dias.");
      return;
    }
    avancar();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Formas de pagamento"
          description="É possível cadastrar mais de uma forma de pagamento na mesma proposta."
          action={
            <Button type="button" variant="outline" size="sm" onClick={adicionarForma}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          }
        />
        <div className="flex flex-col gap-4">
          {formas.map((f, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Select
                  value={f.tipo}
                  onChange={(e) => atualizarForma(i, { tipo: e.target.value as FormaPagamento["tipo"] })}
                  className="w-52"
                >
                  {Object.entries(LABEL_TIPO_PAGAMENTO).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </Select>
                <button type="button" onClick={() => removerForma(i)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldWrapper label="Descrição" required className="sm:col-span-2">
                  <Input value={f.descricao} onChange={(e) => atualizarForma(i, { descricao: e.target.value })} placeholder="Ex.: PIX à vista com 5% de desconto" />
                </FieldWrapper>
                {f.tipo !== "a_vista" && (
                  <>
                    <FieldWrapper label="Valor de entrada (R$)">
                      <Input
                        defaultValue={f.valorEntradaCentavos ? (f.valorEntradaCentavos / 100).toFixed(2) : ""}
                        onChange={(e) => atualizarForma(i, { valorEntradaCentavos: converterOuZero(e.target.value) })}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Número de parcelas">
                      <Input
                        type="number"
                        value={f.numeroParcelas ?? ""}
                        onChange={(e) => atualizarForma(i, { numeroParcelas: Number(e.target.value) || 0 })}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Valor da parcela (R$)">
                      <Input
                        defaultValue={f.valorParcelaCentavos ? (f.valorParcelaCentavos / 100).toFixed(2) : ""}
                        onChange={(e) => atualizarForma(i, { valorParcelaCentavos: converterOuZero(e.target.value) })}
                      />
                    </FieldWrapper>
                  </>
                )}
                <FieldWrapper label="Observações" className="sm:col-span-2">
                  <Input value={f.observacoes ?? ""} onChange={(e) => atualizarForma(i, { observacoes: e.target.value })} />
                </FieldWrapper>
              </div>
            </div>
          ))}
          {formas.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nenhuma forma de pagamento adicionada.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Prazos" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Prazo estimado de instalação (dias)">
            <Input
              type="number"
              value={cc.prazoEstimadoDias ?? ""}
              onChange={(e) => setCC({ prazoEstimadoDias: e.target.value ? Number(e.target.value) : null })}
            />
          </FieldWrapper>
          <FieldWrapper label="Validade da proposta (dias)" required>
            <Input type="number" value={cc.validadeDias ?? 7} onChange={(e) => setCC({ validadeDias: Number(e.target.value) || 1 })} />
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Itens incluídos" />
        <ListaEditavel itens={cc.itensIncluidos ?? []} onChange={(itens) => setCC({ itensIncluidos: itens })} placeholder="Ex.: Instalação completa do sistema" />
      </Card>

      <Card>
        <CardHeader title="Itens não incluídos" />
        <ListaEditavel itens={cc.itensNaoIncluidos ?? []} onChange={(itens) => setCC({ itensNaoIncluidos: itens })} placeholder="Ex.: Reforço estrutural do telhado" />
      </Card>

      <Card>
        <CardHeader title="Responsabilidades do cliente" />
        <ListaEditavel
          itens={cc.responsabilidadesCliente ?? []}
          onChange={(itens) => setCC({ responsabilidadesCliente: itens })}
          placeholder="Ex.: Disponibilizar acesso ao local de instalação"
        />
      </Card>

      <Card>
        <CardHeader title="Observações comerciais" />
        <TextArea value={cc.observacoesComerciais ?? ""} onChange={(e) => setCC({ observacoesComerciais: e.target.value })} />
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={continuar}>Continuar</Button>
      </div>
    </div>
  );
}

function converterOuZero(valor: string): number {
  try {
    return brlParaCentavos(valor);
  } catch {
    return 0;
  }
}
