"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, Badge } from "@/app/painel/_components/ui/Card";
import { Input, TextArea, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { brlParaCentavos, centavosParaBRL } from "@/lib/domain/money";
import type { OrcamentoExtraido, ItemOrcamentoExtraido } from "@/lib/gemini/schema";
import { confirmarOrcamentoAction } from "../actions";
import type { EstadoWizard } from "./tipos";

function orcamentoVazio(): OrcamentoExtraido {
  return {
    fornecedor: null,
    numeroCotacao: null,
    integrador: null,
    clienteDestino: null,
    emissao: null,
    validade: null,
    condicaoPagamento: null,
    potenciaWp: 0,
    itens: [],
    valores: {
      produtosCentavos: 0,
      freteCentavos: 0,
      seguroCentavos: 0,
      icmsCentavos: 0,
      ipiCentavos: 0,
      stCentavos: 0,
      diferencialAliquotaCentavos: 0,
      totalCentavos: 0,
    },
    observacoes: [],
    alertas: [],
  };
}

function itemVazio(): ItemOrcamentoExtraido {
  return {
    descricao: "",
    codigo: null,
    fabricante: null,
    quantidade: 1,
    unidade: "UN",
    potenciaUnitariaW: null,
    paginaOrigem: null,
    confianca: 1,
  };
}

export function Step2Conferencia({
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
  const [orcamento, setOrcamento] = useState<OrcamentoExtraido>(estado.orcamento ?? orcamentoVazio());
  const [salvando, setSalvando] = useState(false);

  function atualizarValor(campo: keyof OrcamentoExtraido["valores"], valorTexto: string) {
    try {
      const centavos = brlParaCentavos(valorTexto);
      setOrcamento((o) => ({ ...o, valores: { ...o.valores, [campo]: centavos } }));
    } catch {
      // ignora enquanto o usuário ainda está digitando um valor incompleto
    }
  }

  function atualizarItem<K extends keyof ItemOrcamentoExtraido>(indice: number, campo: K, valor: ItemOrcamentoExtraido[K]) {
    setOrcamento((o) => {
      const itens = [...o.itens];
      itens[indice] = { ...itens[indice], [campo]: valor };
      return { ...o, itens };
    });
  }

  function removerItem(indice: number) {
    setOrcamento((o) => ({ ...o, itens: o.itens.filter((_, i) => i !== indice) }));
  }

  function adicionarItem() {
    setOrcamento((o) => ({ ...o, itens: [...o.itens, itemVazio()] }));
  }

  const somaComponentes =
    orcamento.valores.produtosCentavos +
    orcamento.valores.freteCentavos +
    orcamento.valores.seguroCentavos +
    orcamento.valores.icmsCentavos +
    orcamento.valores.ipiCentavos +
    orcamento.valores.stCentavos +
    orcamento.valores.diferencialAliquotaCentavos;

  const totalDiverge = somaComponentes !== orcamento.valores.totalCentavos;

  async function confirmar() {
    if (!estado.factoryQuoteId) {
      notificar("erro", "Nenhum orçamento vinculado. Volte para a etapa anterior.");
      return;
    }
    if (orcamento.itens.length === 0) {
      notificar("erro", "Adicione ao menos um item ao orçamento.");
      return;
    }

    setSalvando(true);
    const resultado = await confirmarOrcamentoAction(estado.factoryQuoteId, orcamento);
    setSalvando(false);

    if (!resultado.sucesso) {
      notificar("erro", resultado.erro || "Não foi possível salvar as correções.");
      return;
    }

    const erros = (resultado.alertas ?? []).filter((a) => a.severidade === "erro");
    if (erros.length > 0) {
      notificar("erro", `Corrija antes de continuar: ${erros[0].mensagem}`);
      atualizar({ orcamento, alertasOrcamento: resultado.alertas ?? [] });
      return;
    }

    atualizar({ orcamento, alertasOrcamento: resultado.alertas ?? [] });
    notificar("sucesso", "Dados do orçamento confirmados.");
    avancar();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title={estado.modoManual ? "Preenchimento manual do orçamento" : "Conferência da extração"}
          description={
            estado.modoManual
              ? "Preencha os dados do orçamento da fábrica manualmente."
              : "Confira os dados identificados pela IA e corrija o que for necessário antes de continuar."
          }
        />

        {estado.alertasOrcamento.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {estado.alertasOrcamento.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  a.severidade === "erro" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{a.mensagem}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Fornecedor">
            <Input value={orcamento.fornecedor ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, fornecedor: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Número da cotação">
            <Input value={orcamento.numeroCotacao ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, numeroCotacao: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Integrador">
            <Input value={orcamento.integrador ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, integrador: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Cliente/destino informado pela fábrica">
            <Input value={orcamento.clienteDestino ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, clienteDestino: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Data de emissão" hint="Formato AAAA-MM-DD">
            <Input type="date" value={orcamento.emissao ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, emissao: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Data de validade" hint="Formato AAAA-MM-DD">
            <Input type="date" value={orcamento.validade ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, validade: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Condição de pagamento">
            <Input value={orcamento.condicaoPagamento ?? ""} onChange={(e) => setOrcamento((o) => ({ ...o, condicaoPagamento: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Potência do sistema (Wp)">
            <Input
              type="number"
              value={orcamento.potenciaWp || ""}
              onChange={(e) => setOrcamento((o) => ({ ...o, potenciaWp: Number(e.target.value) || 0 }))}
            />
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Produtos"
          action={
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar item
            </Button>
          }
        />
        <div className="flex flex-col gap-3">
          {orcamento.itens.map((item, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <Input placeholder="Descrição" value={item.descricao} onChange={(e) => atualizarItem(i, "descricao", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Input placeholder="Código" value={item.codigo ?? ""} onChange={(e) => atualizarItem(i, "codigo", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Input placeholder="Fabricante" value={item.fabricante ?? ""} onChange={(e) => atualizarItem(i, "fabricante", e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <Input type="number" placeholder="Qtd." value={item.quantidade || ""} onChange={(e) => atualizarItem(i, "quantidade", Number(e.target.value) || 0)} />
              </div>
              <div className="sm:col-span-1">
                <Input placeholder="Unid." value={item.unidade ?? ""} onChange={(e) => atualizarItem(i, "unidade", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  placeholder="Potência (W)"
                  value={item.potenciaUnitariaW ?? ""}
                  onChange={(e) => atualizarItem(i, "potenciaUnitariaW", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-1">
                {item.confianca < 0.7 && <Badge tone="amber">baixa confiança</Badge>}
                <button type="button" onClick={() => removerItem(i)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {orcamento.itens.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum item adicionado ainda.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Valores" description="Todos os valores em reais (R$)." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ValorField label="Produtos" valorCentavos={orcamento.valores.produtosCentavos} onChange={(v) => atualizarValor("produtosCentavos", v)} />
          <ValorField label="Frete" valorCentavos={orcamento.valores.freteCentavos} onChange={(v) => atualizarValor("freteCentavos", v)} />
          <ValorField label="Seguro" valorCentavos={orcamento.valores.seguroCentavos} onChange={(v) => atualizarValor("seguroCentavos", v)} />
          <ValorField label="ICMS" valorCentavos={orcamento.valores.icmsCentavos} onChange={(v) => atualizarValor("icmsCentavos", v)} />
          <ValorField label="IPI" valorCentavos={orcamento.valores.ipiCentavos} onChange={(v) => atualizarValor("ipiCentavos", v)} />
          <ValorField label="Substituição tributária" valorCentavos={orcamento.valores.stCentavos} onChange={(v) => atualizarValor("stCentavos", v)} />
          <ValorField label="Diferencial de alíquota" valorCentavos={orcamento.valores.diferencialAliquotaCentavos} onChange={(v) => atualizarValor("diferencialAliquotaCentavos", v)} />
          <ValorField label="Total geral" valorCentavos={orcamento.valores.totalCentavos} onChange={(v) => atualizarValor("totalCentavos", v)} destaque />
        </div>

        {totalDiverge && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              A soma dos componentes ({centavosParaBRL(somaComponentes)}) não confere com o total informado (
              {centavosParaBRL(orcamento.valores.totalCentavos)}). Revise os valores antes de continuar.
            </span>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Observações" />
        <TextArea
          value={orcamento.observacoes.join("\n")}
          onChange={(e) => setOrcamento((o) => ({ ...o, observacoes: e.target.value.split("\n").filter(Boolean) }))}
          placeholder="Uma observação por linha"
        />
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={confirmar} loading={salvando}>Confirmar e continuar</Button>
      </div>
    </div>
  );
}

function ValorField({
  label,
  valorCentavos,
  onChange,
  destaque,
}: {
  label: string;
  valorCentavos: number;
  onChange: (valor: string) => void;
  destaque?: boolean;
}) {
  const [texto, setTexto] = useState(centavosParaBRL(valorCentavos).replace("R$", "").trim());

  return (
    <FieldWrapper label={label}>
      <Input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(e.target.value);
        }}
        className={destaque ? "font-semibold" : undefined}
      />
    </FieldWrapper>
  );
}
