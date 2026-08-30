"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clienteSchema, type ClienteFormValues, ESTADOS_BR } from "@/lib/schemas/cliente";
import { formatarCEP, formatarCpfCnpj, formatarTelefone } from "@/lib/format";
import { salvarClienteAction } from "../actions";
import { Button } from "@/app/painel/_components/ui/Button";
import { Input, Select, TextArea, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { ConfirmDialog } from "@/app/painel/_components/ui/ConfirmDialog";

export function ClienteForm({ valoresIniciais }: { valoresIniciais?: Partial<ClienteFormValues> }) {
  const router = useRouter();
  const { notificar } = useToast();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      tipoPessoa: "fisica",
      nomeRazaoSocial: "",
      ...valoresIniciais,
    },
  });

  async function onSubmit(valores: ClienteFormValues) {
    const resultado = await salvarClienteAction(valores);
    if (!resultado.sucesso) {
      notificar("erro", resultado.erro || "Não foi possível salvar o cliente.");
      return;
    }
    notificar("sucesso", "Cliente salvo com sucesso.");
    router.push("/painel/clientes");
    router.refresh();
  }

  function handleVoltar() {
    if (isDirty) {
      setConfirmandoSaida(true);
      return;
    }
    router.push("/painel/clientes");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Identificação" description="Tipo de pessoa e dados principais." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Tipo de pessoa" required>
            <Select {...register("tipoPessoa")}>
              <option value="fisica">Pessoa física</option>
              <option value="juridica">Pessoa jurídica</option>
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Nome / Razão social" required error={errors.nomeRazaoSocial?.message}>
            <Input {...register("nomeRazaoSocial")} error={!!errors.nomeRazaoSocial} placeholder="Nome completo ou razão social" />
          </FieldWrapper>

          <FieldWrapper label="CPF/CNPJ" error={errors.cpfCnpj?.message}>
            <Controller
              control={control}
              name="cpfCnpj"
              render={({ field }) => (
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatarCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  error={!!errors.cpfCnpj}
                />
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="E-mail" error={errors.email?.message}>
            <Input type="email" {...register("email")} placeholder="cliente@email.com" />
          </FieldWrapper>

          <FieldWrapper label="Telefone">
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatarTelefone(e.target.value))}
                  placeholder="(65) 3333-4444"
                />
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="WhatsApp">
            <Controller
              control={control}
              name="whatsapp"
              render={({ field }) => (
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatarTelefone(e.target.value))}
                  placeholder="(65) 99999-8888"
                />
              )}
            />
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Endereço" description="Necessário para instalação e homologação." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="CEP">
            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatarCEP(e.target.value))}
                  placeholder="78000-000"
                />
              )}
            />
          </FieldWrapper>
          <FieldWrapper label="Endereço" className="sm:col-span-2">
            <Input {...register("endereco")} placeholder="Rua, avenida..." />
          </FieldWrapper>
          <FieldWrapper label="Número">
            <Input {...register("numero")} />
          </FieldWrapper>
          <FieldWrapper label="Complemento">
            <Input {...register("complemento")} />
          </FieldWrapper>
          <FieldWrapper label="Bairro">
            <Input {...register("bairro")} />
          </FieldWrapper>
          <FieldWrapper label="Cidade">
            <Input {...register("cidade")} />
          </FieldWrapper>
          <FieldWrapper label="Estado">
            <Select {...register("estado")}>
              <option value="">—</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </Select>
          </FieldWrapper>
        </div>
      </Card>

      <Card>
        <CardHeader title="Dados de energia" description="Preencha se já estiverem disponíveis." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Unidade consumidora">
            <Input {...register("unidadeConsumidora")} />
          </FieldWrapper>
          <FieldWrapper label="Concessionária">
            <Input {...register("concessionaria")} placeholder="Ex.: Energisa MT" />
          </FieldWrapper>
        </div>
        <div className="mt-4">
          <FieldWrapper label="Observações">
            <TextArea {...register("observacoes")} placeholder="Informações adicionais sobre o cliente" />
          </FieldWrapper>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleVoltar}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar cliente
        </Button>
      </div>

      <ConfirmDialog
        aberto={confirmandoSaida}
        titulo="Descartar alterações?"
        descricao="Você tem alterações não salvas neste cliente. Deseja realmente sair?"
        textoConfirmar="Descartar"
        tom="danger"
        onConfirmar={() => router.push("/painel/clientes")}
        onCancelar={() => setConfirmandoSaida(false)}
      />
    </form>
  );
}
