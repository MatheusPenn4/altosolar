import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, Badge } from "@/app/painel/_components/ui/Card";
import { centavosParaBRL } from "@/lib/domain/money";
import { formatarKwp } from "@/lib/domain/potencia";
import { formatarDataBR } from "@/lib/format";
import { STATUS_PROPOSTA_LABEL, type StatusProposta, type TechnicalDataProposta } from "@/lib/supabase/types";
import { PropostaAcoes } from "./_components/PropostaAcoes";

export const metadata = { title: "Detalhe da proposta" };

const TOM_STATUS: Record<StatusProposta, "slate" | "cyan" | "green" | "amber" | "red" | "purple"> = {
  draft: "slate", ready: "purple", sent: "cyan", accepted: "green", rejected: "red", expired: "amber", archived: "slate",
};

export default async function DetalhePropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: proposta } = await supabase
    .from("proposals")
    .select("*, clients(nome_razao_social, cidade, estado, telefone, email), seller:profiles!proposals_seller_id_fkey(nome)")
    .eq("id", id)
    .maybeSingle();

  if (!proposta) notFound();

  const { data: versoes } = await supabase
    .from("proposal_versions")
    .select("id, version_number, generated_at")
    .eq("proposal_id", id)
    .order("version_number", { ascending: false });

  const technicalData = proposta.technical_data as TechnicalDataProposta | null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{proposta.codigo}</h1>
            <Badge tone={TOM_STATUS[proposta.status as StatusProposta]}>{STATUS_PROPOSTA_LABEL[proposta.status as StatusProposta]}</Badge>
          </div>
          <p className="text-sm text-slate-500">{proposta.clients?.nome_razao_social}</p>
        </div>
        <PropostaAcoes propostaId={proposta.id} statusAtual={proposta.status} temVersoes={(versoes?.length ?? 0) > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Resumo técnico" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Potência" valor={formatarKwp(proposta.potencia_wp ?? 0)} />
              <Info label="Consumo médio" valor={`${proposta.consumo_medio_kwh ?? "—"} kWh`} />
              <Info label="Geração mensal" valor={`${proposta.geracao_mensal_kwh ?? "—"} kWh`} />
              <Info label="Tipo de instalação" valor={technicalData?.tipoInstalacao ?? "—"} />
              <Info label="Vendedor" valor={proposta.seller?.nome ?? "—"} />
              <Info label="Validade" valor={proposta.valid_until ? formatarDataBR(proposta.valid_until) : "—"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Cliente" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Nome" valor={proposta.clients?.nome_razao_social ?? "—"} />
              <Info label="Cidade/UF" valor={proposta.clients?.cidade ? `${proposta.clients.cidade}/${proposta.clients.estado ?? ""}` : "—"} />
              <Info label="Telefone" valor={proposta.clients?.telefone ?? "—"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Histórico de versões" description="Cada geração de PDF cria uma nova versão — versões antigas permanecem acessíveis." />
            {(versoes ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma versão gerada ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {versoes!.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Versão {v.version_number}</p>
                      <p className="text-xs text-slate-500">
                        Gerada em {new Date(v.generated_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <a
                      href={`/api/propostas/${proposta.id}/versoes/${v.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-blue hover:underline"
                    >
                      Baixar PDF
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-brand-blue/20 bg-brand-blue/[0.03]">
            <p className="text-xs font-medium uppercase text-slate-500">Valor final</p>
            <p className="text-2xl font-semibold text-slate-900">{centavosParaBRL(proposta.sale_price_cents ?? 0)}</p>
          </Card>

          <Card>
            <CardHeader title="Internos" description="Visível apenas no painel." />
            <div className="flex flex-col gap-3">
              <Info label="Valor da fábrica" valor={centavosParaBRL(proposta.factory_cost_cents ?? 0)} />
              <Info label="Custos adicionais" valor={centavosParaBRL(proposta.additional_costs_cents ?? 0)} />
              <Info label="Desconto" valor={centavosParaBRL(proposta.discount_cents ?? 0)} />
              <Info label="Alteração manual?" valor={proposta.manual_price_override ? "Sim" : "Não"} />
              {proposta.override_reason && <Info label="Motivo da alteração" valor={proposta.override_reason} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{valor}</p>
    </div>
  );
}
