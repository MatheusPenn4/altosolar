import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { montarDadosProposta } from "@/lib/proposalTemplate/normalizar";
import { chamarGeradorPdf, ErroGeracaoPdf, resolverUrlBaseInterna } from "@/lib/proposalTemplate/chamarGerador";
import type { TechnicalDataProposta, PaymentConditionsProposta, SimulationDataProposta } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const STATUS_HTTP_POR_TIPO_ERRO: Record<string, number> = {
  validacao: 422,
  overflow: 422,
  auth: 500, // segredo mal configurado no servidor — problema nosso, não do usuário
  interno: 500,
  rede: 502,
  metodo: 500,
  desconhecido: 500,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: proposta, error } = await supabase
    .from("proposals")
    .select(
      "*, clients(nome_razao_social, cidade, estado, unidade_consumidora, concessionaria), seller:profiles!proposals_seller_id_fkey(nome, telefone)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  if (!proposta.clients) {
    return NextResponse.json({ erro: "A proposta não tem um cliente vinculado." }, { status: 422 });
  }

  const { data: settings } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();

  const technicalData = proposta.technical_data as TechnicalDataProposta;
  const paymentConditions = proposta.payment_conditions as PaymentConditionsProposta;
  const simulationData = proposta.simulation_data as SimulationDataProposta;

  const dadosProposta = montarDadosProposta({
    proposta: {
      codigo: proposta.codigo,
      status: proposta.status,
      criadoEmISO: proposta.created_at,
      validoAteISO: proposta.valid_until ?? proposta.created_at.slice(0, 10),
      potenciaWp: proposta.potencia_wp,
      consumoMedioKwh: proposta.consumo_medio_kwh != null ? Number(proposta.consumo_medio_kwh) : null,
      geracaoMensalKwh: proposta.geracao_mensal_kwh != null ? Number(proposta.geracao_mensal_kwh) : null,
      geracaoAnualKwh: proposta.geracao_anual_kwh != null ? Number(proposta.geracao_anual_kwh) : null,
      areaUtilM2: proposta.area_util_m2 != null ? Number(proposta.area_util_m2) : null,
      tarifaCentsKwh: proposta.tarifa_cents_kwh,
      salePriceCents: proposta.sale_price_cents ?? 0,
      includedItems: proposta.included_items ?? [],
      excludedItems: proposta.excluded_items ?? [],
      warranties: proposta.warranties ?? {},
      technicalData,
      paymentConditions,
      simulationData,
    },
    cliente: {
      nomeRazaoSocial: proposta.clients.nome_razao_social,
      cidade: proposta.clients.cidade,
      estado: proposta.clients.estado,
      unidadeConsumidora: proposta.clients.unidade_consumidora,
      concessionaria: proposta.clients.concessionaria,
    },
    vendedor: proposta.seller ? { nome: proposta.seller.nome, telefone: proposta.seller.telefone } : null,
    empresa: {
      nome: settings?.company_name ?? "Alto Solar",
      cnpj: settings?.company_cnpj ?? null,
      telefone: settings?.company_phone ?? null,
      whatsapp: settings?.company_whatsapp ?? null,
      institucionalTexto: settings?.institutional_text ?? null,
    },
    numeroVersao: 0, // placeholder — recalculado abaixo antes de gerar o PDF
  });

  const baseUrl = resolverUrlBaseInterna(request.headers);

  // Insere a linha de versão ANTES de chamar o gerador: reserva o número via a
  // constraint unique(proposal_id, version_number), evitando duas requisições
  // simultâneas (duplo clique) gerarem a mesma versão. pdf_path é preenchido
  // depois do upload; se a geração falhar, a linha reservada é removida.
  let numeroVersao = ((await supabase
    .from("proposal_versions")
    .select("version_number")
    .eq("proposal_id", id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()
  ).data?.version_number ?? 0) + 1;

  const reservarVersao = async (tentativa: number) =>
    supabase
      .from("proposal_versions")
      .insert({ proposal_id: id, version_number: tentativa, snapshot: {}, generated_by: user.id })
      .select("id")
      .single();

  let { data: versaoReservada, error: erroReserva } = await reservarVersao(numeroVersao);
  if (erroReserva?.code === "23505") {
    numeroVersao += 1;
    ({ data: versaoReservada, error: erroReserva } = await reservarVersao(numeroVersao));
  }
  if (erroReserva || !versaoReservada) {
    return NextResponse.json({ erro: "Não foi possível iniciar a geração do PDF. Tente novamente." }, { status: 500 });
  }

  const dadosFinais = { ...dadosProposta, meta: { ...dadosProposta.meta, version: String(numeroVersao) } };

  const desfazerReserva = async () => supabase.from("proposal_versions").delete().eq("id", versaoReservada.id);

  let resultado;
  try {
    resultado = await chamarGeradorPdf(dadosFinais, baseUrl);
  } catch (erro) {
    await desfazerReserva();
    const mensagem = erro instanceof ErroGeracaoPdf ? erro.message : "Falha ao gerar o PDF da proposta.";
    const tipo = erro instanceof ErroGeracaoPdf ? erro.tipo : "desconhecido";
    console.error(`Falha ao gerar PDF da proposta ${id} (tipo=${tipo}):`, erro);
    await supabase
      .from("proposals")
      .update({ last_generation_error: mensagem.slice(0, 2000), last_generation_error_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ erro: mensagem, tipo }, { status: STATUS_HTTP_POR_TIPO_ERRO[tipo] ?? 500 });
  }

  const caminhoStorage = `${id}/v${numeroVersao}.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from("propostas-geradas")
    .upload(caminhoStorage, resultado.pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (erroUpload) {
    await desfazerReserva();
    return NextResponse.json({ erro: "Falha ao salvar o PDF gerado." }, { status: 500 });
  }

  const snapshot = { ...proposta, _proposalTemplateData: dadosFinais };

  const { error: erroAtualizarVersao } = await supabase
    .from("proposal_versions")
    .update({
      snapshot,
      pdf_path: caminhoStorage,
      pdf_sha256: resultado.sha256,
      pdf_size_bytes: resultado.tamanhoBytes,
      template_version: resultado.versaoTemplate,
    })
    .eq("id", versaoReservada.id);

  if (erroAtualizarVersao) {
    return NextResponse.json({ erro: erroAtualizarVersao.message }, { status: 500 });
  }

  await supabase
    .from("proposals")
    .update({ status: "ready", last_generation_error: null, last_generation_error_at: null })
    .eq("id", id);

  await supabase.from("audit_logs").insert({
    entity_type: "proposal",
    entity_id: id,
    action: "generate_pdf",
    new_data: { version_number: numeroVersao, template_version: resultado.versaoTemplate, sha256: resultado.sha256 },
    user_id: user.id,
  });

  const { data: signed } = await supabase.storage
    .from("propostas-geradas")
    .createSignedUrl(caminhoStorage, 60 * 10);

  return NextResponse.json({
    sucesso: true,
    versionId: versaoReservada.id,
    versionNumber: numeroVersao,
    url: signed?.signedUrl ?? null,
  });
}
