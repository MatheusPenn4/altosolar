"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { Input, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { salvarConfiguracoesGlobaisIAAction, type ConfiguracoesGlobaisIAFormValues } from "../actions";

const formSchema = z.object({
  fallbackAutomatico: z.boolean(),
  maxTentativasPorProvider: z.number().int().min(1).max(3),
  maxFallbacks: z.number().int().min(1).max(5),
  timeoutMs: z.number().int().min(5_000).max(45_000),
});

export function ConfiguracoesGlobaisForm({ valoresIniciais }: { valoresIniciais: ConfiguracoesGlobaisIAFormValues }) {
  const { notificar } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfiguracoesGlobaisIAFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valoresIniciais,
  });

  async function onSubmit(valores: ConfiguracoesGlobaisIAFormValues) {
    const resultado = await salvarConfiguracoesGlobaisIAAction(valores);
    if (!resultado.sucesso) {
      notificar("erro", resultado.erro || "Não foi possível salvar.");
      return;
    }
    notificar("sucesso", "Configurações salvas.");
  }

  return (
    <Card>
      <CardHeader
        title="Fallback e limites"
        description="Regras aplicadas a toda análise, independente de qual integração for usada. Limites máximos protegem contra loops e custo descontrolado."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            {...register("fallbackAutomatico")}
          />
          Fallback automático entre integrações
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper
            label="Máximo de tentativas por integração"
            hint="Repetições na mesma integração antes de cair para a próxima."
            error={errors.maxTentativasPorProvider?.message}
          >
            <Input type="number" min={1} max={3} {...register("maxTentativasPorProvider", { valueAsNumber: true })} error={!!errors.maxTentativasPorProvider} />
          </FieldWrapper>

          <FieldWrapper
            label="Máximo de integrações tentadas"
            hint="Quantas integrações diferentes, no total, por análise."
            error={errors.maxFallbacks?.message}
          >
            <Input type="number" min={1} max={5} {...register("maxFallbacks", { valueAsNumber: true })} error={!!errors.maxFallbacks} />
          </FieldWrapper>

          <FieldWrapper label="Timeout por chamada (ms)" error={errors.timeoutMs?.message}>
            <Input type="number" min={5000} max={45000} step={1000} {...register("timeoutMs", { valueAsNumber: true })} error={!!errors.timeoutMs} />
          </FieldWrapper>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </Card>
  );
}
