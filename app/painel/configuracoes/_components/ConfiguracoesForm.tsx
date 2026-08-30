"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Input, TextArea, Select, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { salvarConfiguracoesAction, type ConfiguracoesFormValues } from "../actions";
import { SERVICOS_PADRAO } from "@/lib/schemas/proposta";

const LABEL_SERVICO: Record<string, string> = {
  instalacao: "Instalação",
  projeto_eletrico: "Projeto elétrico",
  homologacao: "Homologação junto à concessionária",
  estrutura_fixacao: "Estrutura de fixação",
  protecoes_eletricas: "Proteções elétricas",
  configuracao_sistema: "Configuração do sistema",
  monitoramento: "Monitoramento",
  treinamento_cliente: "Treinamento do cliente",
};

interface AppSettingsRow {
  company_name: string | null;
  company_legal_name: string | null;
  company_cnpj: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_whatsapp: string | null;
  company_email: string | null;
  institutional_text: string | null;
  default_validity_days: number | null;
  default_seller_id: string | null;
  gemini_model: string | null;
  ai_analysis_enabled: boolean | null;
  default_services: { chave: string; label: string; incluido: boolean }[] | null;
  default_warranties: Record<string, string> | null;
  default_financial_assumptions: {
    reajusteAnualPercentual?: number;
    degradacaoAnualPercentual?: number;
    anosProjecao?: number;
  } | null;
}

export function ConfiguracoesForm({
  settings,
  vendedores,
}: {
  settings: AppSettingsRow | null;
  vendedores: { id: string; nome: string }[];
}) {
  const { notificar } = useToast();
  const [servicos, setServicos] = useState<{ chave: string; label: string; incluido: boolean }[]>(
    settings?.default_services?.length
      ? settings.default_services
      : SERVICOS_PADRAO.map((chave) => ({ chave, label: LABEL_SERVICO[chave], incluido: true }))
  );

  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm<ConfiguracoesFormValues>({
    defaultValues: {
      companyName: settings?.company_name ?? "Alto Solar",
      companyLegalName: settings?.company_legal_name ?? "",
      companyCnpj: settings?.company_cnpj ?? "",
      companyAddress: settings?.company_address ?? "",
      companyPhone: settings?.company_phone ?? "",
      companyWhatsapp: settings?.company_whatsapp ?? "",
      companyEmail: settings?.company_email ?? "",
      institutionalText: settings?.institutional_text ?? "",
      defaultValidityDays: settings?.default_validity_days ?? 7,
      defaultSellerId: settings?.default_seller_id ?? null,
      geminiModel: settings?.gemini_model ?? "",
      aiAnalysisEnabled: settings?.ai_analysis_enabled ?? true,
      defaultWarranties: settings?.default_warranties ?? {
        instalacao: "12 meses",
        modulos: "12 anos (fabricante)",
        performance: "25 anos (fabricante)",
        inversor: "5 anos (fabricante)",
        microinversor: "",
        outras: "",
      },
      defaultFinancialAssumptions: settings?.default_financial_assumptions ?? {
        reajusteAnualPercentual: 8,
        degradacaoAnualPercentual: 0.5,
        anosProjecao: 25,
      },
      defaultServices: servicos,
    },
  });

  async function onSubmit(valores: ConfiguracoesFormValues) {
    const resultado = await salvarConfiguracoesAction({ ...valores, defaultServices: servicos });
    if (!resultado.sucesso) {
      notificar("erro", resultado.erro || "Não foi possível salvar as configurações.");
      return;
    }
    notificar("sucesso", "Configurações salvas com sucesso.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Dados da Alto Solar" description="Usados no cabeçalho e rodapé do PDF da proposta." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Nome fantasia" required>
            <Input {...register("companyName")} />
          </FieldWrapper>
          <FieldWrapper label="Razão social">
            <Input {...register("companyLegalName")} />
          </FieldWrapper>
          <FieldWrapper label="CNPJ">
            <Input {...register("companyCnpj")} />
          </FieldWrapper>
          <FieldWrapper label="E-mail">
            <Input type="email" {...register("companyEmail")} />
          </FieldWrapper>
          <FieldWrapper label="Telefone">
            <Input {...register("companyPhone")} />
          </FieldWrapper>
          <FieldWrapper label="WhatsApp">
            <Input {...register("companyWhatsapp")} />
          </FieldWrapper>
          <FieldWrapper label="Endereço" className="sm:col-span-2">
            <Input {...register("companyAddress")} />
          </FieldWrapper>
          <FieldWrapper label="Texto institucional" className="sm:col-span-2" hint="Exibido na página 2 do PDF da proposta.">
            <TextArea {...register("institutionalText")} rows={4} />
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Padrões de proposta" description="Valores pré-preenchidos ao criar uma nova proposta." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Validade padrão (dias)" required>
            <Input type="number" min={1} {...register("defaultValidityDays", { valueAsNumber: true })} />
          </FieldWrapper>
          <FieldWrapper label="Vendedor padrão">
            <Select {...register("defaultSellerId")}>
              <option value="">—</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Serviços padrão incluídos</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {servicos.map((s, i) => (
              <label key={s.chave} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={s.incluido}
                  onChange={(e) => {
                    const copia = [...servicos];
                    copia[i] = { ...copia[i], incluido: e.target.checked };
                    setServicos(copia);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Garantia da instalação">
            <Input {...register("defaultWarranties.instalacao" as const)} />
          </FieldWrapper>
          <FieldWrapper label="Garantia dos módulos">
            <Input {...register("defaultWarranties.modulos" as const)} />
          </FieldWrapper>
          <FieldWrapper label="Garantia de performance">
            <Input {...register("defaultWarranties.performance" as const)} />
          </FieldWrapper>
          <FieldWrapper label="Garantia do inversor">
            <Input {...register("defaultWarranties.inversor" as const)} />
          </FieldWrapper>
          <FieldWrapper label="Garantia de microinversor">
            <Input {...register("defaultWarranties.microinversor" as const)} />
          </FieldWrapper>
          <FieldWrapper label="Outras garantias">
            <Input {...register("defaultWarranties.outras" as const)} />
          </FieldWrapper>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="Reajuste anual da tarifa (%)" hint="Premissa padrão da simulação financeira.">
            <Input type="number" step="0.1" {...register("defaultFinancialAssumptions.reajusteAnualPercentual" as const, { valueAsNumber: true })} />
          </FieldWrapper>
          <FieldWrapper label="Degradação anual dos módulos (%)">
            <Input type="number" step="0.1" {...register("defaultFinancialAssumptions.degradacaoAnualPercentual" as const, { valueAsNumber: true })} />
          </FieldWrapper>
          <FieldWrapper label="Anos de projeção">
            <Input type="number" min={0} max={25} {...register("defaultFinancialAssumptions.anosProjecao" as const, { valueAsNumber: true })} />
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Análise por IA (Gemini)" description="Extração automática dos orçamentos da fábrica." />
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Controller
              control={control}
              name="aiAnalysisEnabled"
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
              )}
            />
            Ativar análise automática por IA ao enviar orçamentos em PDF
          </label>

          <FieldWrapper
            label="Modelo Gemini (referência)"
            hint="Informativo. O modelo realmente utilizado é definido pela variável de ambiente GEMINI_MODEL no servidor."
          >
            <Input {...register("geminiModel")} placeholder="ex.: gemini-2.5-flash" />
          </FieldWrapper>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Atenção: ao habilitar a análise por IA, os PDFs de orçamento enviados são processados pela
            API do Gemini (Google). Evite enviar documentos reais de clientes na camada gratuita da API
            sem revisar a política de privacidade do provedor.
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
