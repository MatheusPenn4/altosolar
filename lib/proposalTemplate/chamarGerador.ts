/**
 * Chama a função Python da Vercel (`api/gerar-proposta-pdf.py`) que renderiza o PDF.
 * Nunca usa `child_process` — é uma chamada HTTP normal entre duas funções serverless
 * da mesma implantação, autenticada por um segredo compartilhado (a função Python roda
 * fora do pipeline do Next.js, então `middleware.ts`/sessão do Supabase não a protegem).
 * Só deve ser importado de código server-side (Route Handlers, Server Actions).
 */
import type { ProposalTemplateData } from "./tipos";

export type TipoErroGeracaoPdf = "validacao" | "overflow" | "auth" | "interno" | "rede" | "metodo" | "desconhecido";

export class ErroGeracaoPdf extends Error {
  constructor(message: string, public readonly tipo: TipoErroGeracaoPdf) {
    super(message);
    this.name = "ErroGeracaoPdf";
  }
}

export interface ResultadoGeracaoPdf {
  pdfBuffer: Buffer;
  sha256: string;
  tamanhoBytes: number;
  paginas: number;
  versaoTemplate: string;
}

/** Resolve a URL base desta mesma implantação a partir dos headers da requisição recebida. */
export function resolverUrlBaseInterna(headers: Headers): string {
  const proto = headers.get("x-forwarded-proto") ?? "https";
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function chamarGeradorPdf(dados: ProposalTemplateData, baseUrl: string): Promise<ResultadoGeracaoPdf> {
  const segredo = process.env.PROPOSAL_PDF_INTERNAL_SECRET;
  if (!segredo) {
    throw new ErroGeradorPdfConfig();
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/api/gerar-proposta-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": segredo },
      body: JSON.stringify({ proposalData: dados }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha de rede desconhecida.";
    throw new ErroGeracaoPdf(`Não foi possível contatar o gerador de PDF: ${mensagem}`, "rede");
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok || !corpo?.sucesso) {
    const mensagem: string = corpo?.erro ?? `Falha ao gerar o PDF (HTTP ${resposta.status}).`;
    const tipo: TipoErroGeracaoPdf = corpo?.tipo ?? "desconhecido";
    throw new ErroGeracaoPdf(mensagem, tipo);
  }

  return {
    pdfBuffer: Buffer.from(corpo.pdfBase64, "base64"),
    sha256: corpo.sha256,
    tamanhoBytes: corpo.tamanhoBytes,
    paginas: corpo.paginas,
    versaoTemplate: corpo.versaoTemplate,
  };
}

class ErroGeradorPdfConfig extends ErroGeracaoPdf {
  constructor() {
    super("PROPOSAL_PDF_INTERNAL_SECRET não configurado no servidor.", "interno");
  }
}
