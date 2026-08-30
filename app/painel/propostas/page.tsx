import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Badge } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { centavosParaBRL } from "@/lib/domain/money";
import { STATUS_PROPOSTA_LABEL, type StatusProposta } from "@/lib/supabase/types";
import { formatarDataBR } from "@/lib/format";

export const metadata = { title: "Propostas" };

const TOM_STATUS: Record<StatusProposta, "slate" | "cyan" | "green" | "amber" | "red" | "purple"> = {
  draft: "slate", ready: "purple", sent: "cyan", accepted: "green", rejected: "red", expired: "amber", archived: "slate",
};

interface PropostaListaLinha {
  id: string;
  codigo: string;
  status: StatusProposta;
  sale_price_cents: number | null;
  created_at: string;
  valid_until: string | null;
  clients: { nome_razao_social: string } | null;
}

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("proposals")
    .select("id, codigo, status, sale_price_cents, created_at, valid_until, clients(nome_razao_social)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: propostas } = await query.returns<PropostaListaLinha[]>();
  const lista = propostas ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Propostas</h1>
          <p className="text-sm text-slate-500">Todas as propostas geradas.</p>
        </div>
        <Link href="/painel/propostas/nova">
          <Button>
            <Plus className="h-4 w-4" />
            Nova proposta
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <FiltroStatus status={status} label="Todas" valor={undefined} />
        {(Object.keys(STATUS_PROPOSTA_LABEL) as StatusProposta[]).map((s) => (
          <FiltroStatus key={s} status={status} label={STATUS_PROPOSTA_LABEL[s]} valor={s} />
        ))}
      </div>

      <Card>
        {lista.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Nenhuma proposta encontrada"
            description="Ajuste o filtro ou crie uma nova proposta."
            action={
              <Link href="/painel/propostas/nova">
                <Button><Plus className="h-4 w-4" />Nova proposta</Button>
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
                  <th className="py-2 pr-4">Validade</th>
                  <th className="py-2 pr-4">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <Link href={`/painel/propostas/${p.id}`} className="font-medium text-brand-blue hover:underline">{p.codigo}</Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{p.clients?.nome_razao_social ?? "—"}</td>
                    <td className="py-3 pr-4"><Badge tone={TOM_STATUS[p.status as StatusProposta]}>{STATUS_PROPOSTA_LABEL[p.status as StatusProposta]}</Badge></td>
                    <td className="py-3 pr-4 text-slate-700">{centavosParaBRL(p.sale_price_cents ?? 0)}</td>
                    <td className="py-3 pr-4 text-slate-500">{p.valid_until ? formatarDataBR(p.valid_until) : "—"}</td>
                    <td className="py-3 pr-4 text-slate-500">{formatarDataBR(new Date(p.created_at).toISOString().slice(0, 10))}</td>
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

function FiltroStatus({ status, label, valor }: { status?: string; label: string; valor?: string }) {
  const ativo = status === valor || (!status && !valor);
  const href = valor ? `/painel/propostas?status=${valor}` : "/painel/propostas";
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${ativo ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {label}
    </Link>
  );
}
