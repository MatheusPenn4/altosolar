"use client";

import { useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Input, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import type { Equipamento } from "@/lib/schemas/proposta";
import type { EstadoWizard } from "./tipos";

export function Step5Equipamentos({
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
  useEffect(() => {
    if (estado.equipamentos.length === 0 && estado.orcamento?.itens.length) {
      atualizar({
        equipamentos: estado.orcamento.itens.map((i) => ({
          descricao: i.descricao,
          codigo: i.codigo,
          fabricante: i.fabricante,
          quantidade: i.quantidade,
          unidade: i.unidade,
          potenciaUnitariaW: i.potenciaUnitariaW,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function atualizarEquipamento<K extends keyof Equipamento>(indice: number, campo: K, valor: Equipamento[K]) {
    const copia = [...estado.equipamentos];
    copia[indice] = { ...copia[indice], [campo]: valor };
    atualizar({ equipamentos: copia });
  }

  function removerEquipamento(indice: number) {
    atualizar({ equipamentos: estado.equipamentos.filter((_, i) => i !== indice) });
  }

  function adicionarEquipamento() {
    atualizar({
      equipamentos: [
        ...estado.equipamentos,
        { descricao: "", codigo: null, fabricante: null, quantidade: 1, unidade: "UN", potenciaUnitariaW: null },
      ],
    });
  }

  function alternarServico(indice: number) {
    const copia = [...estado.servicos];
    copia[indice] = { ...copia[indice], incluido: !copia[indice].incluido };
    atualizar({ servicos: copia });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Equipamentos"
          description="Itens importados do orçamento — edite os dados que serão exibidos na proposta."
          action={
            <Button type="button" variant="outline" size="sm" onClick={adicionarEquipamento}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          }
        />
        <div className="flex flex-col gap-3">
          {estado.equipamentos.map((eq, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <Input placeholder="Descrição" value={eq.descricao} onChange={(e) => atualizarEquipamento(i, "descricao", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Input placeholder="Fabricante" value={eq.fabricante ?? ""} onChange={(e) => atualizarEquipamento(i, "fabricante", e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <Input type="number" placeholder="Qtd." value={eq.quantidade || ""} onChange={(e) => atualizarEquipamento(i, "quantidade", Number(e.target.value) || 0)} />
              </div>
              <div className="sm:col-span-1">
                <Input placeholder="Unid." value={eq.unidade ?? ""} onChange={(e) => atualizarEquipamento(i, "unidade", e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  placeholder="Potência (W)"
                  value={eq.potenciaUnitariaW ?? ""}
                  onChange={(e) => atualizarEquipamento(i, "potenciaUnitariaW", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="flex items-center justify-end sm:col-span-1">
                <button type="button" onClick={() => removerEquipamento(i)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {estado.equipamentos.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum equipamento adicionado.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Serviços incluídos" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {estado.servicos.map((s, i) => (
            <label key={s.chave} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={s.incluido}
                onChange={() => alternarServico(i)}
                className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              {s.label}
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Garantias" description="Deixe em branco caso não se aplique." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Garantia da instalação">
            <Input value={estado.garantias.instalacao ?? ""} onChange={(e) => atualizar({ garantias: { ...estado.garantias, instalacao: e.target.value } })} />
          </FieldWrapper>
          <FieldWrapper label="Garantia dos módulos">
            <Input value={estado.garantias.modulos ?? ""} onChange={(e) => atualizar({ garantias: { ...estado.garantias, modulos: e.target.value } })} />
          </FieldWrapper>
          <FieldWrapper label="Garantia de performance">
            <Input value={estado.garantias.performance ?? ""} onChange={(e) => atualizar({ garantias: { ...estado.garantias, performance: e.target.value } })} />
          </FieldWrapper>
          <FieldWrapper label="Garantia do inversor">
            <Input value={estado.garantias.inversor ?? ""} onChange={(e) => atualizar({ garantias: { ...estado.garantias, inversor: e.target.value } })} />
          </FieldWrapper>
          <FieldWrapper label="Garantia de microinversor">
            <Input value={estado.garantias.microinversor ?? ""} onChange={(e) => atualizar({ garantias: { ...estado.garantias, microinversor: e.target.value } })} />
          </FieldWrapper>
          <FieldWrapper label="Outras garantias">
            <Input value={estado.garantias.outras ?? ""} onChange={(e) => atualizar({ garantias: { ...estado.garantias, outras: e.target.value } })} />
          </FieldWrapper>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={avancar}>Continuar</Button>
      </div>
    </div>
  );
}
