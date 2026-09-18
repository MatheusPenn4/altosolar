"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/app/painel/_components/ui/Button";
import { Input, Select, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { criarConfiguracaoIAAction, atualizarConfiguracaoIAAction, buscarModelosDisponiveisAction } from "../actions";
import type { ProviderConfigResumo } from "./ProviderConfigCard";

const formSchema = z.object({
  nome: z.string().min(1, "Informe um nome identificador."),
  provider: z.literal("google_gemini"),
  modelo: z.string().min(1, "Informe o modelo."),
  apiKey: z.string().optional(),
  prioridade: z.number().int().min(1).max(99),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProviderConfigForm({
  modo,
  configuracaoExistente,
  onFechar,
}: {
  modo: "criar" | "editar";
  configuracaoExistente?: ProviderConfigResumo;
  /** Só usado no modo "editar" — no modo "criar" o form controla sua própria abertura. */
  onFechar?: () => void;
}) {
  const { notificar } = useToast();
  const [abertoInterno, setAbertoInterno] = useState(false);
  const [modelosSugeridos, setModelosSugeridos] = useState<string[]>([]);
  const [buscandoModelos, setBuscandoModelos] = useState(false);

  const aberto = modo === "criar" ? abertoInterno : true;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: configuracaoExistente?.nome ?? "",
      provider: "google_gemini",
      modelo: configuracaoExistente?.modelo ?? "",
      apiKey: "",
      prioridade: configuracaoExistente?.prioridade ?? 1,
      ativo: configuracaoExistente?.ativo ?? true,
    },
  });

  function fechar() {
    if (modo === "criar") setAbertoInterno(false);
    else onFechar?.();
  }

  async function onSubmit(valores: FormValues) {
    const resultado =
      modo === "criar"
        ? await criarConfiguracaoIAAction(valores)
        : await atualizarConfiguracaoIAAction({ ...valores, id: configuracaoExistente!.id });

    if (!resultado.sucesso) {
      notificar("erro", resultado.erro || "Não foi possível salvar.");
      return;
    }
    notificar("sucesso", modo === "criar" ? "Integração criada." : "Integração atualizada.");
    fechar();
  }

  async function buscarModelos() {
    const apiKeyDigitada = watch("apiKey");
    if (!apiKeyDigitada) {
      notificar("erro", "Informe a API Key antes de buscar os modelos disponíveis.");
      return;
    }
    setBuscandoModelos(true);
    const modelos = await buscarModelosDisponiveisAction(apiKeyDigitada);
    setBuscandoModelos(false);
    if (modelos.length === 0) {
      notificar("erro", "Não foi possível listar os modelos com essa chave.");
      return;
    }
    setModelosSugeridos(modelos);
  }

  if (!aberto) {
    return (
      <Button onClick={() => setAbertoInterno(true)}>
        <Plus className="h-4 w-4" />
        Adicionar integração
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full max-w-lg flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 className="text-base font-semibold text-slate-900">
          {modo === "criar" ? "Nova integração de IA" : "Editar integração"}
        </h3>

        <FieldWrapper label="Nome identificador" required error={errors.nome?.message}>
          <Input {...register("nome")} placeholder="Ex.: Gemini Principal" error={!!errors.nome} />
        </FieldWrapper>

        <FieldWrapper label="Provider" required>
          <Select {...register("provider")}>
            <option value="google_gemini">Google Gemini</option>
          </Select>
        </FieldWrapper>

        <FieldWrapper
          label="Modelo"
          required
          error={errors.modelo?.message}
          hint="Nome exato do modelo (ex.: gemini-2.5-flash). Confira o que já está configurado antes de trocar."
        >
          <div className="flex gap-2">
            <Input {...register("modelo")} list="modelos-sugeridos" error={!!errors.modelo} className="flex-1" />
            <Button type="button" variant="outline" onClick={buscarModelos} loading={buscandoModelos}>
              Buscar modelos
            </Button>
          </div>
          {modelosSugeridos.length > 0 && (
            <datalist id="modelos-sugeridos">
              {modelosSugeridos.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          )}
        </FieldWrapper>

        <FieldWrapper
          label={modo === "criar" ? "API Key" : "Nova API Key"}
          required={modo === "criar"}
          hint={modo === "editar" ? "Deixe em branco para manter a chave atual." : undefined}
        >
          <Input {...register("apiKey")} type="password" autoComplete="off" placeholder={modo === "editar" ? "••••••••" : ""} />
        </FieldWrapper>

        <FieldWrapper label="Prioridade" required hint="Menor número = maior prioridade." error={errors.prioridade?.message}>
          <Input type="number" min={1} max={99} {...register("prioridade", { valueAsNumber: true })} error={!!errors.prioridade} />
        </FieldWrapper>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue" {...register("ativo")} />
          Ativa
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}
