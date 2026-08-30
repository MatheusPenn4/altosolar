"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Check } from "lucide-react";
import { Card, CardHeader, Badge } from "@/app/painel/_components/ui/Card";
import { Input, Select, FieldWrapper } from "@/app/painel/_components/ui/Field";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { buscarClientesAction, salvarClienteAction } from "@/app/painel/clientes/actions";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/format";
import { ESTADOS_BR } from "@/lib/schemas/cliente";
import type { ClienteFormValues } from "@/lib/schemas/cliente";
import type { EstadoWizard, ClienteResumo } from "./tipos";
import { FaturaEnergiaUpload } from "./FaturaEnergiaUpload";

export function Step3Cliente({
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
  const [modo, setModo] = useState<"buscar" | "novo">(estado.clienteSelecionado ? "buscar" : "buscar");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [novoCliente, setNovoCliente] = useState<Partial<ClienteFormValues>>({ tipoPessoa: "fisica" });
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setBuscando(true);
      const dados = await buscarClientesAction(termo);
      setResultados(dados as ClienteResumo[]);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [termo]);

  async function cadastrarNovo() {
    if (!novoCliente.nomeRazaoSocial || novoCliente.nomeRazaoSocial.trim().length < 2) {
      notificar("erro", "Informe o nome ou razão social.");
      return;
    }
    setSalvandoNovo(true);
    const resultado = await salvarClienteAction({
      tipoPessoa: novoCliente.tipoPessoa ?? "fisica",
      nomeRazaoSocial: novoCliente.nomeRazaoSocial,
      cpfCnpj: novoCliente.cpfCnpj,
      telefone: novoCliente.telefone,
      whatsapp: novoCliente.whatsapp,
      email: novoCliente.email,
      cidade: novoCliente.cidade,
      estado: novoCliente.estado,
      unidadeConsumidora: novoCliente.unidadeConsumidora,
      concessionaria: novoCliente.concessionaria,
    });
    setSalvandoNovo(false);

    if (!resultado.sucesso || !resultado.clienteId) {
      notificar("erro", resultado.erro || "Não foi possível cadastrar o cliente.");
      return;
    }

    atualizar({
      clienteSelecionado: {
        id: resultado.clienteId,
        nome_razao_social: novoCliente.nomeRazaoSocial,
        cpf_cnpj: novoCliente.cpfCnpj ?? null,
        cidade: novoCliente.cidade ?? null,
        tipo_pessoa: novoCliente.tipoPessoa ?? "fisica",
      },
    });
    notificar("sucesso", "Cliente cadastrado com sucesso.");
  }

  function continuar() {
    if (!estado.clienteSelecionado) {
      notificar("erro", "Selecione ou cadastre um cliente para continuar.");
      return;
    }
    avancar();
  }

  /** Ao selecionar um cliente que já tem perfil energético salvo (de uma fatura
   * analisada antes), puxa esses dados direto para a etapa de Projeto — sem
   * precisar reanexar a fatura. */
  function selecionarCliente(c: ClienteResumo) {
    const temPerfil =
      c.tipo_ligacao || c.consumo_medio_kwh || c.tarifa_cents_kwh || c.consumo_ultimos_12_meses?.length;

    if (!temPerfil) {
      atualizar({ clienteSelecionado: c });
      return;
    }

    atualizar({
      clienteSelecionado: c,
      dadosTecnicos: {
        ...estado.dadosTecnicos,
        ...(c.tipo_instalacao && { tipoInstalacao: c.tipo_instalacao as EstadoWizard["dadosTecnicos"]["tipoInstalacao"] }),
        ...(c.tipo_ligacao && { tipoLigacao: c.tipo_ligacao as EstadoWizard["dadosTecnicos"]["tipoLigacao"] }),
        ...(c.consumo_medio_kwh && { consumoMedioKwh: c.consumo_medio_kwh }),
        ...(c.tarifa_cents_kwh && { tarifaCentavosKwh: c.tarifa_cents_kwh }),
        ...(c.consumo_ultimos_12_meses?.length === 12 && { consumoUltimos12Meses: c.consumo_ultimos_12_meses }),
      },
    });
    notificar("sucesso", "Este cliente já tinha dados de consumo salvos — aplicados automaticamente ao projeto.");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Cliente" description="Selecione um cliente já cadastrado ou cadastre um novo." />

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setModo("buscar")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${modo === "buscar" ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Selecionar existente
          </button>
          <button
            type="button"
            onClick={() => setModo("novo")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${modo === "novo" ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Cadastrar novo
          </button>
        </div>

        {modo === "buscar" ? (
          <div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar por nome ou CPF/CNPJ..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-2">
              {buscando && <p className="text-sm text-slate-500">Buscando...</p>}
              {!buscando &&
                resultados.map((c) => {
                  const selecionado = estado.clienteSelecionado?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selecionarCliente(c)}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        selecionado ? "border-brand-blue bg-brand-blue/5" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-800">{c.nome_razao_social}</p>
                        <p className="text-xs text-slate-500">
                          {c.cpf_cnpj ? formatarCpfCnpj(c.cpf_cnpj) : "Sem documento"} {c.cidade ? `· ${c.cidade}` : ""}
                        </p>
                      </div>
                      {selecionado && <Check className="h-4 w-4 text-brand-blue" />}
                    </button>
                  );
                })}
              {!buscando && resultados.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">Nenhum cliente encontrado.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper label="Tipo de pessoa">
                <Select
                  value={novoCliente.tipoPessoa}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, tipoPessoa: e.target.value as "fisica" | "juridica" }))}
                >
                  <option value="fisica">Pessoa física</option>
                  <option value="juridica">Pessoa jurídica</option>
                </Select>
              </FieldWrapper>
              <FieldWrapper label="Nome / Razão social" required>
                <Input
                  value={novoCliente.nomeRazaoSocial ?? ""}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, nomeRazaoSocial: e.target.value }))}
                />
              </FieldWrapper>
              <FieldWrapper label="CPF/CNPJ">
                <Input
                  value={novoCliente.cpfCnpj ?? ""}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, cpfCnpj: formatarCpfCnpj(e.target.value) }))}
                />
              </FieldWrapper>
              <FieldWrapper label="Telefone">
                <Input
                  value={novoCliente.telefone ?? ""}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, telefone: formatarTelefone(e.target.value) }))}
                />
              </FieldWrapper>
              <FieldWrapper label="WhatsApp">
                <Input
                  value={novoCliente.whatsapp ?? ""}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, whatsapp: formatarTelefone(e.target.value) }))}
                />
              </FieldWrapper>
              <FieldWrapper label="E-mail">
                <Input value={novoCliente.email ?? ""} onChange={(e) => setNovoCliente((c) => ({ ...c, email: e.target.value }))} />
              </FieldWrapper>
              <FieldWrapper label="Cidade">
                <Input value={novoCliente.cidade ?? ""} onChange={(e) => setNovoCliente((c) => ({ ...c, cidade: e.target.value }))} />
              </FieldWrapper>
              <FieldWrapper label="Estado">
                <Select value={novoCliente.estado ?? ""} onChange={(e) => setNovoCliente((c) => ({ ...c, estado: e.target.value }))}>
                  <option value="">—</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </Select>
              </FieldWrapper>
              <FieldWrapper label="Unidade consumidora">
                <Input
                  value={novoCliente.unidadeConsumidora ?? ""}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, unidadeConsumidora: e.target.value }))}
                />
              </FieldWrapper>
              <FieldWrapper label="Concessionária">
                <Input
                  value={novoCliente.concessionaria ?? ""}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, concessionaria: e.target.value }))}
                />
              </FieldWrapper>
            </div>
            <div>
              <Button type="button" onClick={cadastrarNovo} loading={salvandoNovo}>
                <UserPlus className="h-4 w-4" />
                Cadastrar cliente
              </Button>
            </div>
          </div>
        )}

        {estado.clienteSelecionado && (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <Check className="h-4 w-4" />
            Cliente selecionado: <strong>{estado.clienteSelecionado.nome_razao_social}</strong>
            <Badge tone="green">{estado.clienteSelecionado.tipo_pessoa === "juridica" ? "Jurídica" : "Física"}</Badge>
          </div>
        )}
      </Card>

      {estado.clienteSelecionado && (
        <FaturaEnergiaUpload
          clienteId={estado.clienteSelecionado.id}
          onAplicar={(_fatura, perfil) =>
            atualizar({
              dadosTecnicos: {
                ...estado.dadosTecnicos,
                ...(perfil.tipoInstalacao && { tipoInstalacao: perfil.tipoInstalacao as EstadoWizard["dadosTecnicos"]["tipoInstalacao"] }),
                ...(perfil.tipoLigacao && { tipoLigacao: perfil.tipoLigacao as EstadoWizard["dadosTecnicos"]["tipoLigacao"] }),
                ...(perfil.consumoMedioKwh && { consumoMedioKwh: perfil.consumoMedioKwh }),
                ...(perfil.tarifaCentavosKwh && { tarifaCentavosKwh: perfil.tarifaCentavosKwh }),
                ...(perfil.consumoUltimos12Meses && { consumoUltimos12Meses: perfil.consumoUltimos12Meses }),
              },
            })
          }
        />
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>Voltar</Button>
        <Button onClick={continuar}>Continuar</Button>
      </div>
    </div>
  );
}
