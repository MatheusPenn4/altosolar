"use client";

import { useMemo } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Input, Select, TextArea, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { calcularPotenciaTotalW, contaComoModuloFotovoltaico, divergePotencia, formatarKwp } from "@/lib/domain/potencia";
import { TIPOS_INSTALACAO, TIPOS_LIGACAO, TIPOS_COBERTURA, type DadosTecnicos } from "@/lib/schemas/proposta";
import type { EstadoWizard } from "./tipos";

const LABEL_TIPO_INSTALACAO: Record<string, string> = {
  residencial: "Residencial", comercial: "Comercial", industrial: "Industrial", rural: "Rural",
};
const LABEL_TIPO_LIGACAO: Record<string, string> = {
  monofasica: "Monofásica", bifasica: "Bifásica", trifasica: "Trifásica",
};
const LABEL_COBERTURA: Record<string, string> = {
  ceramica: "Cerâmica", fibrocimento: "Fibrocimento", metalica: "Metálica", laje: "Laje", solo: "Solo", outra: "Outra",
};

export function Step4Projeto({
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
  const dt = estado.dadosTecnicos;

  const modulosOrcamento = useMemo(
    () => (estado.orcamento?.itens ?? []).filter((i) => contaComoModuloFotovoltaico(i.descricao, i.potenciaUnitariaW)),
    [estado.orcamento]
  );

  const potenciaCalculadaW = useMemo(
    () =>
      calcularPotenciaTotalW(
        modulosOrcamento.map((m) => ({ quantidade: m.quantidade, potenciaUnitariaW: m.potenciaUnitariaW ?? 0 }))
      ),
    [modulosOrcamento]
  );

  const potenciaPropostaW = dt.potenciaPropostaW ?? 0;
  const diverge = potenciaCalculadaW > 0 && potenciaPropostaW > 0 && divergePotencia(potenciaPropostaW, potenciaCalculadaW);

  function set<K extends keyof typeof dt>(campo: K, valor: (typeof dt)[K]) {
    atualizar({ dadosTecnicos: { ...dt, [campo]: valor } });
  }

  function continuar() {
    if (!dt.consumoMedioKwh || !dt.tarifaCentavosKwh || !dt.potenciaPropostaW || !dt.geracaoMensalKwh || !dt.geracaoAnualKwh) {
      notificar("erro", "Preencha os campos obrigatórios do projeto.");
      return;
    }
    if (diverge && !dt.justificativaDivergenciaPotencia) {
      notificar("erro", "Confirme ou justifique a divergência de potência antes de continuar.");
      return;
    }
    avancar();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Instalação e ligação" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Tipo de instalação" required>
            <Select value={dt.tipoInstalacao ?? "residencial"} onChange={(e) => set("tipoInstalacao", e.target.value as DadosTecnicos["tipoInstalacao"])}>
              {TIPOS_INSTALACAO.map((t) => (
                <option key={t} value={t}>{LABEL_TIPO_INSTALACAO[t]}</option>
              ))}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Tipo de ligação" required>
            <Select value={dt.tipoLigacao ?? "monofasica"} onChange={(e) => set("tipoLigacao", e.target.value as DadosTecnicos["tipoLigacao"])}>
              {TIPOS_LIGACAO.map((t) => (
                <option key={t} value={t}>{LABEL_TIPO_LIGACAO[t]}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Consumo e tarifa" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Média mensal de consumo (kWh)" required>
            <Input
              type="number"
              value={dt.consumoMedioKwh ?? ""}
              onChange={(e) => set("consumoMedioKwh", Number(e.target.value) || 0)}
            />
          </FieldWrapper>
          <FieldWrapper label="Tarifa utilizada no cálculo (R$/kWh)" required hint="Informe em reais, ex.: 0,95">
            <Input
              type="number"
              step="0.01"
              value={dt.tarifaCentavosKwh ? (dt.tarifaCentavosKwh / 100).toFixed(2) : ""}
              onChange={(e) => set("tarifaCentavosKwh", Math.round(Number(e.target.value) * 100) || 0)}
            />
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Potência e geração" />

        {modulosOrcamento.length > 0 && (
          <div className="mb-4 rounded-lg bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Zap className="h-4 w-4 text-brand-blue" />
              Potência calculada pelos módulos do orçamento
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {modulosOrcamento.map((m) => `${m.quantidade} × ${m.potenciaUnitariaW} W`).join(" + ")} ={" "}
              {potenciaCalculadaW.toLocaleString("pt-BR")} W = {formatarKwp(potenciaCalculadaW)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Potência proposta (Wp)" required>
            <Input
              type="number"
              value={dt.potenciaPropostaW ?? ""}
              onChange={(e) => set("potenciaPropostaW", Number(e.target.value) || 0)}
            />
          </FieldWrapper>
          <FieldWrapper label="Área útil necessária (m²)">
            <Input
              type="number"
              value={dt.areaUtilM2 ?? ""}
              onChange={(e) => set("areaUtilM2", e.target.value ? Number(e.target.value) : null)}
            />
          </FieldWrapper>
          <FieldWrapper label="Geração mensal estimada (kWh)" required>
            <Input
              type="number"
              value={dt.geracaoMensalKwh ?? ""}
              onChange={(e) => set("geracaoMensalKwh", Number(e.target.value) || 0)}
            />
          </FieldWrapper>
          <FieldWrapper label="Geração anual estimada (kWh)" required>
            <Input
              type="number"
              value={dt.geracaoAnualKwh ?? ""}
              onChange={(e) => set("geracaoAnualKwh", Number(e.target.value) || 0)}
            />
          </FieldWrapper>
          <FieldWrapper label="Percentual estimado de compensação (%)">
            <Input
              type="number"
              value={dt.percentualCompensacao ?? ""}
              onChange={(e) => set("percentualCompensacao", e.target.value ? Number(e.target.value) : null)}
            />
          </FieldWrapper>
          <FieldWrapper label="Tipo de cobertura">
            <Select
              value={dt.tipoCobertura ?? ""}
              onChange={(e) => set("tipoCobertura", (e.target.value || null) as DadosTecnicos["tipoCobertura"])}
            >
              <option value="">—</option>
              {TIPOS_COBERTURA.map((t) => (
                <option key={t} value={t}>{LABEL_COBERTURA[t]}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        {diverge && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              A potência proposta diverge da potência calculada pelos módulos ({formatarKwp(potenciaCalculadaW)}).
            </p>
            <div className="mt-3">
              <FieldWrapper label="Justificativa da divergência" required>
                <TextArea
                  value={dt.justificativaDivergenciaPotencia ?? ""}
                  onChange={(e) => set("justificativaDivergenciaPotencia", e.target.value)}
                  placeholder="Ex.: alteração combinada com o cliente após o orçamento da fábrica"
                />
              </FieldWrapper>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Observações e responsável" />
        <div className="grid grid-cols-1 gap-4">
          <FieldWrapper label="Observações técnicas">
            <TextArea value={dt.observacoesTecnicas ?? ""} onChange={(e) => set("observacoesTecnicas", e.target.value)} />
          </FieldWrapper>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={continuar}>Continuar</Button>
      </div>
    </div>
  );
}
