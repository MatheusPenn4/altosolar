"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatusProposta } from "@/lib/supabase/types";

const TRANSICOES_VALIDAS: Record<StatusProposta, StatusProposta[]> = {
  draft: ["ready", "archived"],
  ready: ["sent", "archived"],
  sent: ["accepted", "rejected", "expired", "archived"],
  accepted: ["archived"],
  rejected: ["archived"],
  expired: ["archived"],
  archived: [],
};

export async function alterarStatusPropostaAction(propostaId: string, novoStatus: StatusProposta) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: "Sessão expirada." };

  const { data: proposta } = await supabase.from("proposals").select("status").eq("id", propostaId).maybeSingle();
  if (!proposta) return { sucesso: false, erro: "Proposta não encontrada." };

  const statusAtual = proposta.status as StatusProposta;
  if (!TRANSICOES_VALIDAS[statusAtual].includes(novoStatus)) {
    return { sucesso: false, erro: `Não é possível mudar de "${statusAtual}" para "${novoStatus}".` };
  }

  const { error } = await supabase.from("proposals").update({ status: novoStatus }).eq("id", propostaId);
  if (error) return { sucesso: false, erro: error.message };

  await supabase.from("audit_logs").insert({
    entity_type: "proposal",
    entity_id: propostaId,
    action: "change_status",
    old_data: { status: statusAtual },
    new_data: { status: novoStatus },
    user_id: user.id,
  });

  revalidatePath(`/painel/propostas/${propostaId}`);
  return { sucesso: true };
}
