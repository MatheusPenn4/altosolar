import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analisarFaturaPdf } from "@/lib/ai/documentos/fatura";
import { sha256DoArquivo } from "@/lib/gemini/hash";
import { faturaExtraidaSchema, VERSAO_SCHEMA_FATURA, type FaturaExtraida } from "@/lib/gemini/fatura/schema";
import { VERSAO_PROMPT_FATURA } from "@/lib/gemini/fatura/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024;
const ASSINATURA_PDF = Buffer.from("%PDF-");

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  const clientIdBruto = formData.get("clientId");
  // Ao anexar a fatura na tela de "novo cliente", o cliente ainda não existe —
  // nesse caso não há o que persistir em client_energy_bills, só devolvemos a
  // extração para o formulário se preencher sozinho.
  const clientId = typeof clientIdBruto === "string" && clientIdBruto ? clientIdBruto : null;

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ erro: "Apenas arquivos PDF são aceitos." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ erro: "Arquivo maior que o limite de 15 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  if (!bytes.subarray(0, 5).equals(ASSINATURA_PDF)) {
    return NextResponse.json({ erro: "O arquivo não é um PDF válido." }, { status: 400 });
  }

  const { data: settings } = await supabase.from("app_settings").select("ai_analysis_enabled").eq("id", true).maybeSingle();
  if (settings && settings.ai_analysis_enabled === false) {
    return NextResponse.json({ erro: "A análise por IA está desativada nas configurações." }, { status: 409 });
  }

  const hash = sha256DoArquivo(bytes);
  const caminhoStorage = `${clientId ?? "sem-cliente"}/${hash}.pdf`;

  const { error: erroUpload } = await supabase.storage
    .from("faturas-energia")
    .upload(caminhoStorage, bytes, { contentType: "application/pdf", upsert: false });

  if (erroUpload && !/already exists/i.test(erroUpload.message)) {
    return NextResponse.json({ erro: "Falha ao salvar o arquivo no armazenamento." }, { status: 500 });
  }

  const { data: cache } = clientId
    ? await supabase
        .from("client_energy_bills")
        .select("extraction_raw, extraction_model")
        .eq("source_hash", hash)
        .eq("extraction_prompt_version", VERSAO_PROMPT_FATURA)
        .eq("extraction_schema_version", VERSAO_SCHEMA_FATURA)
        .eq("extraction_status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  let fatura: FaturaExtraida;
  let modelo: string;
  let duracaoMs: number;
  let deCache = false;

  if (cache?.extraction_raw) {
    const validado = faturaExtraidaSchema.safeParse(cache.extraction_raw);
    if (!validado.success) {
      return NextResponse.json({ erro: "Cache de extração corrompido. Tente novamente." }, { status: 500 });
    }
    fatura = validado.data;
    modelo = cache.extraction_model ?? "cache";
    duracaoMs = 0;
    deCache = true;
  } else {
    let resultado;
    try {
      resultado = await analisarFaturaPdf(supabase, bytes, user.id);
    } catch {
      return NextResponse.json(
        { erro: "Não foi possível analisar o documento no momento. Tente novamente em alguns minutos." },
        { status: 502 }
      );
    }

    if (!resultado.sucesso || !resultado.fatura) {
      if (clientId) {
        await supabase.from("client_energy_bills").insert({
          client_id: clientId,
          source_file_path: caminhoStorage,
          source_hash: hash,
          extraction_status: "failed",
          extraction_model: resultado.modelo,
          extraction_prompt_version: resultado.versaoPrompt,
          extraction_schema_version: resultado.versaoSchema,
          extraction_duration_ms: resultado.duracaoMs,
          created_by: user.id,
        });
      }
      return NextResponse.json(
        { erro: resultado.erro || "Não foi possível extrair os dados da fatura." },
        { status: 502 }
      );
    }

    fatura = resultado.fatura;
    modelo = resultado.modelo ?? "desconhecido";
    duracaoMs = resultado.duracaoMs;
  }

  let faturaId: string | null = null;
  if (clientId) {
    const { data: registro, error: erroRegistro } = await supabase
      .from("client_energy_bills")
      .insert({
        client_id: clientId,
        source_file_path: caminhoStorage,
        source_hash: hash,
        extraction_status: "success",
        extraction_model: modelo,
        extraction_prompt_version: VERSAO_PROMPT_FATURA,
        extraction_schema_version: VERSAO_SCHEMA_FATURA,
        extraction_raw: fatura,
        extraction_duration_ms: duracaoMs,
        extraction_from_cache: deCache,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (erroRegistro) {
      return NextResponse.json({ erro: erroRegistro.message }, { status: 500 });
    }
    faturaId = registro.id;
  }

  return NextResponse.json({ sucesso: true, deCache, faturaId, fatura });
}
