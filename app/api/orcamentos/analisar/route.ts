import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extrairOrcamentoDoPdf } from "@/lib/gemini/extrair";
import { sha256DoArquivo } from "@/lib/gemini/hash";
import { orcamentoExtraidoSchema, VERSAO_SCHEMA_EXTRACAO, type OrcamentoExtraido } from "@/lib/gemini/schema";
import { VERSAO_PROMPT_EXTRACAO } from "@/lib/gemini/prompt";
import { validarOrcamento } from "@/lib/domain/validacaoOrcamento";

export const runtime = "nodejs";

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB — mesmo limite do bucket de Storage
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
  const preencherManualmente = formData.get("manual") === "true";

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

  const hash = sha256DoArquivo(bytes);
  const nomeArquivoSanitizado = `${hash}.pdf`;
  const caminhoStorage = `${user.id}/${nomeArquivoSanitizado}`;

  // upsert:false — arquivos são nomeados pelo hash do conteúdo, então um upload
  // repetido do mesmo PDF é idempotente: "already exists" não é um erro real, e
  // evita depender de uma policy de UPDATE em storage.objects.
  const { error: erroUpload } = await supabase.storage
    .from("orcamentos-fabrica")
    .upload(caminhoStorage, bytes, { contentType: "application/pdf", upsert: false });

  if (erroUpload && !/already exists/i.test(erroUpload.message)) {
    return NextResponse.json({ erro: "Falha ao salvar o arquivo no armazenamento." }, { status: 500 });
  }

  if (preencherManualmente) {
    const { data: quote, error } = await supabase
      .from("factory_quotes")
      .insert({
        source_file_path: caminhoStorage,
        source_hash: hash,
        extraction_status: "manual",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    return NextResponse.json({ sucesso: true, modo: "manual", factoryQuoteId: quote.id });
  }

  const { data: settings } = await supabase.from("app_settings").select("ai_analysis_enabled").eq("id", true).maybeSingle();
  if (settings && settings.ai_analysis_enabled === false) {
    return NextResponse.json(
      { erro: "A análise por IA está desativada nas configurações. Use o preenchimento manual.", modo: "ia_desativada" },
      { status: 409 }
    );
  }

  // Cache por hash + versões de prompt/schema
  const { data: cache } = await supabase
    .from("factory_quotes")
    .select("extraction_raw, extraction_model, extraction_duration_ms")
    .eq("source_hash", hash)
    .eq("extraction_prompt_version", VERSAO_PROMPT_EXTRACAO)
    .eq("extraction_schema_version", VERSAO_SCHEMA_EXTRACAO)
    .eq("extraction_status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let orcamento: OrcamentoExtraido;
  let modelo: string;
  let duracaoMs: number;
  let deCache = false;

  if (cache?.extraction_raw) {
    const validado = orcamentoExtraidoSchema.safeParse(cache.extraction_raw);
    if (!validado.success) {
      return NextResponse.json({ erro: "Cache de extração corrompido. Tente novamente." }, { status: 500 });
    }
    orcamento = validado.data;
    modelo = cache.extraction_model ?? "cache";
    duracaoMs = 0;
    deCache = true;
  } else {
    let resultado;
    try {
      resultado = await extrairOrcamentoDoPdf(bytes);
    } catch (erro) {
      return NextResponse.json(
        {
          erro: erro instanceof Error ? erro.message : "Falha ao chamar a API do Gemini.",
          modo: "falha_ia",
        },
        { status: 502 }
      );
    }

    if (!resultado.sucesso || !resultado.orcamento) {
      await supabase.from("factory_quotes").insert({
        source_file_path: caminhoStorage,
        source_hash: hash,
        extraction_status: "failed",
        extraction_model: resultado.modelo,
        extraction_prompt_version: resultado.versaoPrompt,
        extraction_schema_version: resultado.versaoSchema,
        extraction_duration_ms: resultado.duracaoMs,
        created_by: user.id,
      });

      return NextResponse.json(
        { erro: resultado.erro || "Não foi possível extrair os dados do orçamento.", modo: "falha_ia" },
        { status: 502 }
      );
    }

    orcamento = resultado.orcamento;
    modelo = resultado.modelo;
    duracaoMs = resultado.duracaoMs;
  }

  const alertasValidacao = validarOrcamento(orcamento);

  const { data: quote, error: erroQuote } = await supabase
    .from("factory_quotes")
    .insert({
      fornecedor: orcamento.fornecedor,
      numero_cotacao: orcamento.numeroCotacao,
      integrador: orcamento.integrador,
      cliente_destino: orcamento.clienteDestino,
      emissao: orcamento.emissao,
      validade: orcamento.validade,
      condicao_pagamento: orcamento.condicaoPagamento,
      potencia_wp: Math.round(orcamento.potenciaWp),
      produtos_cents: orcamento.valores.produtosCentavos,
      frete_cents: orcamento.valores.freteCentavos,
      seguro_cents: orcamento.valores.seguroCentavos,
      icms_cents: orcamento.valores.icmsCentavos,
      ipi_cents: orcamento.valores.ipiCentavos,
      st_cents: orcamento.valores.stCentavos,
      diferencial_aliquota_cents: orcamento.valores.diferencialAliquotaCentavos,
      total_cents: orcamento.valores.totalCentavos,
      source_file_path: caminhoStorage,
      source_hash: hash,
      extraction_status: "success",
      extraction_model: modelo,
      extraction_prompt_version: VERSAO_PROMPT_EXTRACAO,
      extraction_schema_version: VERSAO_SCHEMA_EXTRACAO,
      extraction_raw: orcamento,
      extraction_duration_ms: duracaoMs,
      extraction_from_cache: deCache,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (erroQuote) {
    return NextResponse.json({ erro: erroQuote.message }, { status: 500 });
  }

  if (orcamento.itens.length > 0) {
    const { error: erroItens } = await supabase.from("factory_quote_items").insert(
      orcamento.itens.map((item) => ({
        factory_quote_id: quote.id,
        descricao: item.descricao,
        codigo: item.codigo,
        fabricante: item.fabricante,
        quantidade: item.quantidade,
        unidade: item.unidade,
        potencia_unitaria_w: item.potenciaUnitariaW,
        pagina_origem: item.paginaOrigem,
        confidence: item.confianca,
      }))
    );

    if (erroItens) {
      return NextResponse.json({ erro: erroItens.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    sucesso: true,
    modo: "ia",
    deCache,
    factoryQuoteId: quote.id,
    orcamento,
    alertas: alertasValidacao,
  });
}
