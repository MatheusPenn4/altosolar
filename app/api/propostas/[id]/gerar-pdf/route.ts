import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfProposta } from "@/lib/pdf/gerar";
import type { PropostaPdfData } from "@/lib/pdf/types";
import { BENEFITS } from "@/lib/constants";
import { LOGO_ALTO_SOLAR_BASE64 } from "@/lib/pdf/logoBase64";
import type { TechnicalDataProposta, PaymentConditionsProposta, SimulationDataProposta } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: proposta, error } = await supabase
    .from("proposals")
    .select("*, clients(nome_razao_social, cidade, estado), seller:profiles!proposals_seller_id_fkey(nome, telefone)")
    .eq("id", id)
    .maybeSingle();

  if (error || !proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const { data: settings } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();

  const { data: versoesExistentes } = await supabase
    .from("proposal_versions")
    .select("version_number")
    .eq("proposal_id", id)
    .order("version_number", { ascending: false })
    .limit(1);

  const proximaVersaoNumero = (versoesExistentes?.[0]?.version_number ?? 0) + 1;

  const technicalData = proposta.technical_data as TechnicalDataProposta | null;
  const paymentConditions = proposta.payment_conditions as PaymentConditionsProposta | null;
  const simulationData = proposta.simulation_data as SimulationDataProposta | null;

  const geradoEmISO = new Date().toISOString();

  const dadosPdf: PropostaPdfData = {
    codigo: proposta.codigo,
    versao: proximaVersaoNumero,
    geradoEmISO,
    cliente: {
      nome: proposta.clients?.nome_razao_social ?? "Cliente",
      cidade: proposta.clients?.cidade ?? null,
      estado: proposta.clients?.estado ?? null,
    },
    vendedor: {
      nome: proposta.seller?.nome ?? "Alto Solar",
      telefone: proposta.seller?.telefone ?? null,
      email: null,
    },
    empresa: {
      nomeFantasia: settings?.company_name ?? "Alto Solar",
      razaoSocial: settings?.company_legal_name ?? null,
      cnpj: settings?.company_cnpj ?? null,
      endereco: settings?.company_address ?? null,
      telefone: settings?.company_phone ?? null,
      whatsapp: settings?.company_whatsapp ?? null,
      email: settings?.company_email ?? null,
      textoInstitucional: settings?.institutional_text ?? null,
      logoDataUrl: LOGO_ALTO_SOLAR_BASE64,
    },
    projeto: {
      potenciaWp: proposta.potencia_wp ?? 0,
      consumoMedioKwh: Number(proposta.consumo_medio_kwh ?? 0),
      geracaoMensalKwh: Number(proposta.geracao_mensal_kwh ?? 0),
      geracaoAnualKwh: Number(proposta.geracao_anual_kwh ?? 0),
      areaUtilM2: proposta.area_util_m2 != null ? Number(proposta.area_util_m2) : null,
      percentualCompensacao: technicalData?.percentualCompensacao ?? null,
      tipoInstalacao: technicalData?.tipoInstalacao ?? "residencial",
      tipoCobertura: technicalData?.tipoCobertura ?? null,
    },
    equipamentos: (technicalData?.equipamentos ?? []).map((e) => ({
      descricao: e.descricao,
      fabricante: e.fabricante ?? null,
      quantidade: e.quantidade,
      unidade: e.unidade ?? null,
      potenciaUnitariaW: e.potenciaUnitariaW ?? null,
    })),
    servicos: (technicalData?.servicos ?? []).map((s) => ({ label: s.label, incluido: s.incluido })),
    garantias: proposta.warranties ?? {},
    diferenciais: BENEFITS.slice(0, 4).map((b) => `${b.title} — ${b.desc}`),
    simulacao: {
      economiaMensalCentavos: simulationData?.resultado?.economiaMensalCentavos ?? 0,
      economiaPrimeiroAnoCentavos: simulationData?.resultado?.economiaPrimeiroAnoCentavos ?? 0,
      paybackMeses: simulationData?.resultado?.paybackMeses ?? null,
      projecaoAnual: simulationData?.resultado?.projecaoAnual ?? [],
      premissas: {
        tarifaCentavosKwh: proposta.tarifa_cents_kwh ?? 0,
        reajusteAnualPercentual: simulationData?.premissas?.reajusteAnualPercentual,
        degradacaoAnualPercentual: simulationData?.premissas?.degradacaoAnualPercentual,
      },
    },
    investimento: {
      valorFinalCentavos: proposta.sale_price_cents ?? 0,
      formasPagamento: paymentConditions?.formasPagamento ?? [],
    },
    condicoes: {
      validade: proposta.valid_until
        ? new Date(proposta.valid_until + "T00:00:00").toLocaleDateString("pt-BR")
        : "—",
      prazoEstimadoDias: paymentConditions?.prazoEstimadoDias ?? null,
      itensIncluidos: proposta.included_items ?? [],
      itensNaoIncluidos: proposta.excluded_items ?? [],
      responsabilidadesCliente: technicalData?.responsabilidadesCliente ?? [],
      observacoesComerciais: paymentConditions?.observacoesComerciais ?? null,
    },
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await gerarPdfProposta(dadosPdf);
  } catch (erro) {
    console.error(`Falha ao renderizar o PDF da proposta ${id}:`, erro);
    // TODO: reverter para uma mensagem genérica depois de diagnosticar a falha em produção.
    const detalhe = erro instanceof Error ? `${erro.message}\n${erro.stack ?? ""}` : String(erro);
    return NextResponse.json({ erro: "Falha ao renderizar o PDF da proposta.", detalhe }, { status: 500 });
  }

  const caminhoStorage = `${id}/v${proximaVersaoNumero}.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from("propostas-geradas")
    .upload(caminhoStorage, pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (erroUpload) {
    return NextResponse.json({ erro: "Falha ao salvar o PDF gerado." }, { status: 500 });
  }

  const snapshot = { ...proposta, _pdfData: dadosPdf };

  const { data: versao, error: erroVersao } = await supabase
    .from("proposal_versions")
    .insert({
      proposal_id: id,
      version_number: proximaVersaoNumero,
      snapshot,
      pdf_path: caminhoStorage,
      generated_by: user.id,
    })
    .select("id")
    .single();

  if (erroVersao) {
    return NextResponse.json({ erro: erroVersao.message }, { status: 500 });
  }

  await supabase.from("proposals").update({ status: "ready" }).eq("id", id);

  await supabase.from("audit_logs").insert({
    entity_type: "proposal",
    entity_id: id,
    action: "generate_pdf",
    new_data: { version_number: proximaVersaoNumero },
    user_id: user.id,
  });

  const { data: signed } = await supabase.storage
    .from("propostas-geradas")
    .createSignedUrl(caminhoStorage, 60 * 10);

  return NextResponse.json({
    sucesso: true,
    versionId: versao.id,
    versionNumber: proximaVersaoNumero,
    url: signed?.signedUrl ?? null,
  });
}
