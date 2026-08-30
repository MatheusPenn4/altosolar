"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { estadoInicial, CHAVE_RASCUNHO, NOMES_ETAPAS, type EstadoWizard } from "./tipos";
import { ConfirmDialog } from "@/app/painel/_components/ui/ConfirmDialog";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";

import { Step1Orcamento } from "./Step1Orcamento";
import { Step2Conferencia } from "./Step2Conferencia";
import { Step3Cliente } from "./Step3Cliente";
import { Step4Projeto } from "./Step4Projeto";
import { Step5Equipamentos } from "./Step5Equipamentos";
import { Step6Precificacao } from "./Step6Precificacao";
import { Step7Condicoes } from "./Step7Condicoes";
import { Step8Simulacao } from "./Step8Simulacao";
import { Step9Revisao } from "./Step9Revisao";

function carregarRascunho(): EstadoWizard {
  if (typeof window === "undefined") return estadoInicial();
  try {
    const bruto = window.localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return estadoInicial();
    return { ...estadoInicial(), ...JSON.parse(bruto) };
  } catch {
    return estadoInicial();
  }
}

export function PropostaWizard() {
  const router = useRouter();
  const { notificar } = useToast();
  const [estado, setEstado] = useState<EstadoWizard>(estadoInicial);
  const [hidratado, setHidratado] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    const rascunho = carregarRascunho();
    setEstado(rascunho);
    setHidratado(true);
    if (rascunho.etapaAtual > 1) {
      notificar("sucesso", "Rascunho anterior restaurado.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado));
  }, [estado, hidratado]);

  function atualizar(parcial: Partial<EstadoWizard>) {
    setEstado((atual) => ({ ...atual, ...parcial }));
  }

  function irPara(etapa: number) {
    if (etapa < 1 || etapa > NOMES_ETAPAS.length) return;
    atualizar({ etapaAtual: etapa });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function proxima() {
    irPara(estado.etapaAtual + 1);
  }

  function anterior() {
    irPara(estado.etapaAtual - 1);
  }

  function descartarRascunho() {
    window.localStorage.removeItem(CHAVE_RASCUNHO);
    router.push("/painel/propostas");
  }

  function finalizarComSucesso(propostaId: string) {
    window.localStorage.removeItem(CHAVE_RASCUNHO);
    router.push(`/painel/propostas/${propostaId}`);
  }

  if (!hidratado) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nova proposta</h1>
          <p className="text-sm text-slate-500">
            Etapa {estado.etapaAtual} de {NOMES_ETAPAS.length} — {NOMES_ETAPAS[estado.etapaAtual - 1]}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setConfirmandoSaida(true)}>
          Cancelar
        </Button>
      </div>

      <StepperNav etapaAtual={estado.etapaAtual} onIrPara={irPara} />

      <div>
        {estado.etapaAtual === 1 && <Step1Orcamento atualizar={atualizar} avancar={proxima} />}
        {estado.etapaAtual === 2 && <Step2Conferencia estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 3 && <Step3Cliente estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 4 && <Step4Projeto estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 5 && <Step5Equipamentos estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 6 && <Step6Precificacao estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 7 && <Step7Condicoes estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 8 && <Step8Simulacao estado={estado} atualizar={atualizar} avancar={proxima} voltar={anterior} />}
        {estado.etapaAtual === 9 && (
          <Step9Revisao estado={estado} voltar={anterior} onConcluir={finalizarComSucesso} />
        )}
      </div>

      <ConfirmDialog
        aberto={confirmandoSaida}
        titulo="Descartar esta proposta?"
        descricao="O rascunho salvo será perdido e você voltará para a lista de propostas."
        textoConfirmar="Descartar"
        tom="danger"
        onConfirmar={descartarRascunho}
        onCancelar={() => setConfirmandoSaida(false)}
      />
    </div>
  );
}

function StepperNav({ etapaAtual, onIrPara }: { etapaAtual: number; onIrPara: (etapa: number) => void }) {
  return (
    <div className="scrollbar-none overflow-x-auto">
      <div className="flex min-w-max items-center gap-1">
        {NOMES_ETAPAS.map((nome, i) => {
          const numero = i + 1;
          const concluida = numero < etapaAtual;
          const ativa = numero === etapaAtual;
          return (
            <div key={nome} className="flex items-center">
              <button
                type="button"
                onClick={() => concluida && onIrPara(numero)}
                disabled={!concluida && !ativa}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  ativa && "bg-brand-blue text-white",
                  concluida && !ativa && "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20",
                  !concluida && !ativa && "bg-slate-100 text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px]",
                    ativa && "bg-white/20",
                    concluida && "bg-brand-blue text-white"
                  )}
                >
                  {concluida ? <Check className="h-3 w-3" /> : numero}
                </span>
                {nome}
              </button>
              {numero < NOMES_ETAPAS.length && <div className="h-px w-3 bg-slate-200" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
