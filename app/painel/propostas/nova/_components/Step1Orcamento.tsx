"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X, Loader2, Sparkles, PencilLine } from "lucide-react";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { cn } from "@/lib/utils";
import type { EstadoWizard } from "./tipos";

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024;

export function Step1Orcamento({
  atualizar,
  avancar,
}: {
  atualizar: (parcial: Partial<EstadoWizard>) => void;
  avancar: () => void;
}) {
  const { notificar } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastandoSobre, setArrastandoSobre] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);

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
  }

  async function enviar(modoManual: boolean) {
    if (!arquivo) return;
    setEnviando(true);
    setProgresso(15);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      if (modoManual) formData.append("manual", "true");

      interface RespostaAnalise {
        status: number;
        body: {
          erro?: string;
          modo?: "manual" | "ia" | "ia_desativada" | "falha_ia";
          deCache?: boolean;
          factoryQuoteId?: string;
          orcamento?: EstadoWizard["orcamento"];
          alertas?: EstadoWizard["alertasOrcamento"];
        };
      }

      const resposta = await new Promise<RespostaAnalise>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/orcamentos/analisar");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 60) + 10);
        };
        xhr.onload = () => {
          setProgresso(100);
          try {
            resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
          } catch {
            reject(new Error("Resposta inválida do servidor."));
          }
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao enviar o arquivo."));
        xhr.send(formData);
      });

      if (resposta.status >= 400) {
        notificar("erro", resposta.body.erro || "Não foi possível processar o orçamento.");
        setEnviando(false);
        setProgresso(0);
        return;
      }

      if (resposta.body.modo === "manual") {
        atualizar({
          factoryQuoteId: resposta.body.factoryQuoteId,
          arquivoNome: arquivo.name,
          arquivoTamanho: arquivo.size,
          modoManual: true,
          orcamento: null,
          alertasOrcamento: [],
        });
      } else {
        atualizar({
          factoryQuoteId: resposta.body.factoryQuoteId,
          arquivoNome: arquivo.name,
          arquivoTamanho: arquivo.size,
          modoManual: false,
          orcamento: resposta.body.orcamento,
          alertasOrcamento: resposta.body.alertas ?? [],
        });
        if (resposta.body.deCache) {
          notificar("sucesso", "Este orçamento já havia sido analisado — resultado reaproveitado.");
        } else {
          notificar("sucesso", "Orçamento analisado com sucesso.");
        }
      }

      avancar();
    } catch (erro) {
      notificar("erro", erro instanceof Error ? erro.message : "Erro inesperado ao enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Orçamento da fábrica"
        description="Envie o PDF do orçamento recebido do distribuidor/fábrica para extração automática dos dados."
      />

      {!arquivo ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastandoSobre(true);
          }}
          onDragLeave={() => setArrastandoSobre(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastandoSobre(false);
            selecionarArquivo(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
            arrastandoSobre ? "border-brand-blue bg-brand-blue/5" : "border-slate-300 hover:border-slate-400"
          )}
        >
          <UploadCloud className="mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Arraste o PDF aqui ou clique para selecionar</p>
          <p className="mt-1 text-xs text-slate-500">Apenas arquivos PDF, até 15 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => selecionarArquivo(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
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

          {enviando && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-brand-blue transition-all" style={{ width: `${progresso}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                {progresso < 70 ? "Enviando arquivo..." : "Analisando orçamento com IA..."}
              </p>
            </div>
          )}

          {!enviando && (
            <>
              <p className="mt-4 text-xs text-slate-500">
                Ao analisar, este PDF é enviado à API do Gemini (Google) para extração automática dos dados.
                Evite enviar documentos com dados sensíveis do cliente sem necessidade.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => enviar(false)} className="flex-1">
                  <Sparkles className="h-4 w-4" />
                  Analisar orçamento
                </Button>
                <Button variant="outline" onClick={() => enviar(true)} className="flex-1">
                  <PencilLine className="h-4 w-4" />
                  Preencher manualmente
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
