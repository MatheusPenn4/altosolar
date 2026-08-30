"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, Badge } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { centavosParaBRL } from "@/lib/domain/money";
import { preencherClienteComFaturaAction } from "@/app/painel/clientes/actions";
import { calcularPerfilEnergetico, type PerfilEnergeticoCliente } from "@/lib/domain/perfilEnergetico";
import type { FaturaExtraida } from "@/lib/gemini/fatura/schema";

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024;

const LABEL_CLASSIFICACAO: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  industrial: "Industrial",
  rural: "Rural",
};
const LABEL_LIGACAO: Record<string, string> = {
  monofasica: "Monofásica",
  bifasica: "Bifásica",
  trifasica: "Trifásica",
};

export function FaturaEnergiaUpload({
  clienteId,
  onAplicar,
}: {
  /** `null` quando o cliente ainda não foi salvo (ex.: tela de novo cliente) — nesse
   * caso os dados só são devolvidos via `onAplicar`, sem persistir nada ainda. */
  clienteId: string | null;
  onAplicar: (fatura: FaturaExtraida, perfil: PerfilEnergeticoCliente) => void;
}) {
  const { notificar } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fatura, setFatura] = useState<FaturaExtraida | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  function selecionarArquivo(file: File | undefined | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      notificar("erro", "Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      notificar("erro", "O arquivo excede o limite de 15 MB.");
      return;
    }
    setArquivo(file);
    setFatura(null);
    setAplicado(false);
  }

  async function analisar() {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      if (clienteId) formData.append("clientId", clienteId);

      const resposta = await fetch("/api/faturas/analisar", { method: "POST", body: formData });
      const corpo = await resposta.json();

      if (!resposta.ok || !corpo.sucesso) {
        notificar("erro", corpo.erro || "Não foi possível analisar a fatura.");
        return;
      }

      setFatura(corpo.fatura);
      notificar("sucesso", corpo.deCache ? "Fatura já analisada anteriormente — resultado reaproveitado." : "Fatura analisada com sucesso.");
    } catch {
      notificar("erro", "Erro inesperado ao enviar a fatura.");
    } finally {
      setEnviando(false);
    }
  }

  async function usarDados() {
    if (!fatura) return;
    setAplicando(true);

    const perfil = calcularPerfilEnergetico(fatura);

    if (clienteId) {
      const resultadoCliente = await preencherClienteComFaturaAction(
        clienteId,
        {
          unidadeConsumidora: fatura.unidadeConsumidora,
          concessionaria: fatura.concessionaria,
          endereco: fatura.endereco,
          numero: fatura.numero,
          bairro: fatura.bairro,
          cidade: fatura.cidade,
          estado: fatura.estado,
          cep: fatura.cep,
          tipoInstalacao: fatura.classificacao,
        },
        perfil
      );

      if (!resultadoCliente.sucesso) {
        notificar("erro", resultadoCliente.erro || "Não foi possível atualizar o cadastro do cliente.");
        setAplicando(false);
        return;
      }
    }

    onAplicar(fatura, perfil);
    setAplicado(true);
    setAplicando(false);
    notificar("sucesso", clienteId ? "Dados da fatura aplicados ao cliente e ao projeto." : "Dados da fatura aplicados ao formulário.");
  }

  return (
    <Card className="border-slate-200 bg-slate-50/50">
      <CardHeader
        title="Fatura de energia do cliente (opcional)"
        description={
          clienteId
            ? "Anexe a última fatura para preencher automaticamente unidade consumidora, consumo médio e demais dados do projeto."
            : "Anexe a fatura para preencher automaticamente os dados do cadastro abaixo."
        }
      />

      {!arquivo && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-slate-400"
        >
          <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Clique para selecionar a fatura em PDF</p>
          <p className="mt-1 text-xs text-slate-500">Até 15 MB</p>
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => selecionarArquivo(e.target.files?.[0])} />
        </div>
      )}

      {arquivo && !fatura && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{arquivo.name}</p>
              <p className="text-xs text-slate-500">{(arquivo.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!enviando && (
              <button onClick={() => setArquivo(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-4">
            <Button onClick={analisar} loading={enviando} size="sm">
              <Sparkles className="h-4 w-4" />
              Analisar fatura
            </Button>
          </div>
        </div>
      )}

      {fatura && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {fatura.alertas.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {fatura.alertas.map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Campo label="Unidade consumidora" valor={fatura.unidadeConsumidora} />
            <Campo label="Concessionária" valor={fatura.concessionaria} />
            <Campo label="Classificação" valor={fatura.classificacao ? LABEL_CLASSIFICACAO[fatura.classificacao] : null} />
            <Campo label="Tipo de ligação" valor={fatura.tipoLigacao ? LABEL_LIGACAO[fatura.tipoLigacao] : null} />
            <Campo label="Consumo do mês" valor={fatura.consumoMesKwh ? `${fatura.consumoMesKwh} kWh` : null} />
            <Campo label="Meses no histórico" valor={fatura.historicoConsumo.length ? String(fatura.historicoConsumo.length) : null} />
            <Campo label="Tarifa média" valor={fatura.tarifaMediaCentavosKwh ? `${centavosParaBRL(fatura.tarifaMediaCentavosKwh)}/kWh` : null} />
            <Campo label="Valor da fatura" valor={fatura.valorTotalCentavos ? centavosParaBRL(fatura.valorTotalCentavos) : null} />
            <Campo label="Cidade/UF" valor={fatura.cidade ? `${fatura.cidade}${fatura.estado ? `/${fatura.estado}` : ""}` : null} />
          </div>

          {fatura.possuiGeracaoPropria && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              A fatura indica que a unidade já possui geração própria (créditos de energia injetada).
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            {!aplicado ? (
              <Button onClick={usarDados} loading={aplicando} size="sm">
                {clienteId ? "Usar estes dados no cliente e no projeto" : "Usar estes dados no cadastro"}
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Dados aplicados
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setArquivo(null);
                setFatura(null);
                setAplicado(false);
              }}
            >
              Enviar outra fatura
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{valor ?? <Badge tone="slate">não identificado</Badge>}</p>
    </div>
  );
}
