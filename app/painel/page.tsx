import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Badge } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { centavosParaBRL } from "@/lib/domain/money";
import { STATUS_PROPOSTA_LABEL, type StatusProposta } from "@/lib/supabase/types";
import { formatarDataBR } from "@/lib/format";

const TOM_STATUS: Record<StatusProposta, "slate" | "cyan" | "green" | "amber" | "red" | "purple"> = {
  draft: "slate",
  ready: "purple",
  sent: "cyan",
  accepted: "green",
  rejected: "red",
  expired: "amber",
  archived: "slate",
};

interface PropostaResumoLinha {
  id: string;
  codigo: string;
  status: StatusProposta;
  sale_price_cents: number | null;
  created_at: string;
  client_id: string | null;
  clients: { nome_razao_social: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: propostas } = await supabase
    .from("proposals")
    .select("id, codigo, status, sale_price_cents, created_at, client_id, clients(nome_razao_social)")
    .order("created_at", { ascending: false })
    .returns<PropostaResumoLinha[]>();

  const lista = propostas ?? [];

  const contagem: Record<StatusProposta, number> = {
    draft: 0, ready: 0, sent: 0, accepted: 0, rejected: 0, expired: 0, archived: 0,
  };
  let valorTotalCentavos = 0;
  for (const p of lista) {
    contagem[p.status as StatusProposta]++;
    valorTotalCentavos += p.sale_price_cents ?? 0;
  }

  const totalFechavel = contagem.sent + contagem.accepted + contagem.rejected;
  const taxaConversao = totalFechavel > 0 ? (contagem.accepted / totalFechavel) * 100 : null;

  const recentes = lista.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral das propostas comerciais.</p>
        </div>
        <Link href="/painel/propostas/nova">
          <Button size="lg">
            <Plus className="h-4 w-4" />
            Nova proposta
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total de propostas" valor={lista.length} />
        <MetricCard label="Em rascunho" valor={contagem.draft} />
        <MetricCard label="Enviadas" valor={contagem.sent} />
        <MetricCard label="Aceitas" valor={contagem.accepted} />
        <MetricCard label="Recusadas" valor={contagem.rejected} />
        <MetricCard label="Expiradas" valor={contagem.expired} />
        <MetricCard label="Valor total proposto" valor={centavosParaBRL(valorTotalCentavos)} destaque />
        <MetricCard
          label="Taxa de conversão"
          valor={taxaConversao === null ? "—" : `${taxaConversao.toFixed(0)}%`}
          destaque
        />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Propostas recentes</h2>
          <Link href="/painel/propostas" className="text-sm font-medium text-brand-blue hover:underline">
            Ver todas
          </Link>
        </div>

        {recentes.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Nenhuma proposta criada ainda"
            description="Assim que você criar sua primeira proposta, ela aparecerá aqui."
            action={
              <Link href="/painel/propostas/nova">
                <Button>
                  <Plus className="h-4 w-4" />
                  Criar primeira proposta
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2 pr-4">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <Link href={`/painel/propostas/${p.id}`} className="font-medium text-brand-blue hover:underline">
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{p.clients?.nome_razao_social ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={TOM_STATUS[p.status as StatusProposta]}>
                        {STATUS_PROPOSTA_LABEL[p.status as StatusProposta]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{centavosParaBRL(p.sale_price_cents ?? 0)}</td>
                    <td className="py-3 pr-4 text-slate-500">
                      {formatarDataBR(new Date(p.created_at).toISOString().slice(0, 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ label, valor, destaque }: { label: string; valor: string | number; destaque?: boolean }) {
  return (
    <Card className={destaque ? "border-brand-blue/20 bg-brand-blue/[0.03]" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-slate-900">{valor}</p>
    </Card>
  );
}
