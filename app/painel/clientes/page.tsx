import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Badge } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/format";
import { ClienteSearch } from "./_components/ClienteSearch";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, nome_razao_social, cpf_cnpj, telefone, cidade, estado, tipo_pessoa")
    .order("nome_razao_social");

  const termoSeguro = q?.trim().replace(/[,()."'\\%]/g, "");
  if (termoSeguro) {
    query = query.or(`nome_razao_social.ilike.%${termoSeguro}%,cpf_cnpj.ilike.%${termoSeguro}%`);
  }

  const { data: clientes } = await query;
  const lista = clientes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Gerencie os clientes cadastrados.</p>
        </div>
        <Link href="/painel/clientes/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </Link>
      </div>

      <Card>
        <ClienteSearch valorInicial={q ?? ""} />

        {lista.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={termoSeguro ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
            description={termoSeguro ? "Tente buscar por outro nome ou documento." : "Cadastre seu primeiro cliente para começar a gerar propostas."}
            action={
              !termoSeguro && (
                <Link href="/painel/clientes/novo">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Cadastrar cliente
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Documento</th>
                  <th className="py-2 pr-4">Telefone</th>
                  <th className="py-2 pr-4">Cidade/UF</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <Link href={`/painel/clientes/${c.id}`} className="font-medium text-brand-blue hover:underline">
                        {c.nome_razao_social}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={c.tipo_pessoa === "juridica" ? "purple" : "cyan"}>
                        {c.tipo_pessoa === "juridica" ? "Jurídica" : "Física"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{c.cpf_cnpj ? formatarCpfCnpj(c.cpf_cnpj) : "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">{c.telefone ? formatarTelefone(c.telefone) : "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {c.cidade ? `${c.cidade}${c.estado ? `/${c.estado}` : ""}` : "—"}
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
