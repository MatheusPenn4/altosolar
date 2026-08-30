import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "../_components/ClienteForm";
import { formatarCEP, formatarCpfCnpj, formatarTelefone } from "@/lib/format";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Editar cliente</h1>
        <p className="text-sm text-slate-500">{cliente.nome_razao_social}</p>
      </div>
      <ClienteForm
        clienteId={cliente.id}
        valoresIniciais={{
          id: cliente.id,
          tipoPessoa: cliente.tipo_pessoa,
          nomeRazaoSocial: cliente.nome_razao_social,
          cpfCnpj: cliente.cpf_cnpj ? formatarCpfCnpj(cliente.cpf_cnpj) : "",
          telefone: cliente.telefone ? formatarTelefone(cliente.telefone) : "",
          whatsapp: cliente.whatsapp ? formatarTelefone(cliente.whatsapp) : "",
          email: cliente.email ?? "",
          cep: cliente.cep ? formatarCEP(cliente.cep) : "",
          endereco: cliente.endereco ?? "",
          numero: cliente.numero ?? "",
          complemento: cliente.complemento ?? "",
          bairro: cliente.bairro ?? "",
          cidade: cliente.cidade ?? "",
          estado: cliente.estado ?? "",
          unidadeConsumidora: cliente.unidade_consumidora ?? "",
          concessionaria: cliente.concessionaria ?? "",
          tipoInstalacao: cliente.tipo_instalacao ?? "",
          observacoes: cliente.observacoes ?? "",
        }}
      />
    </div>
  );
}
