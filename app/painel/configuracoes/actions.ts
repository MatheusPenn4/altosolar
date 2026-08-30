"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const configuracoesSchema = z.object({
  companyName: z.string().min(1),
  companyLegalName: z.string().optional(),
  companyCnpj: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyWhatsapp: z.string().optional(),
  companyEmail: z.string().optional(),
  institutionalText: z.string().optional(),
  defaultValidityDays: z.number().int().positive(),
  defaultSellerId: z.string().uuid().nullable().optional(),
  geminiModel: z.string().optional(),
  aiAnalysisEnabled: z.boolean(),
  defaultServices: z.array(z.object({ chave: z.string(), label: z.string(), incluido: z.boolean() })),
  defaultWarranties: z.record(z.string(), z.string()),
  defaultFinancialAssumptions: z.object({
    reajusteAnualPercentual: z.number().min(0).max(100).optional(),
    degradacaoAnualPercentual: z.number().min(0).max(10).optional(),
    anosProjecao: z.number().int().min(0).max(25).optional(),
  }),
});

export type ConfiguracoesFormValues = z.infer<typeof configuracoesSchema>;

export async function salvarConfiguracoesAction(valores: ConfiguracoesFormValues) {
  const validado = configuracoesSchema.safeParse(valores);
  if (!validado.success) {
    return { sucesso: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const v = validado.data;

  const { error } = await supabase
    .from("app_settings")
    .update({
      company_name: v.companyName,
      company_legal_name: v.companyLegalName || null,
      company_cnpj: v.companyCnpj || null,
      company_address: v.companyAddress || null,
      company_phone: v.companyPhone || null,
      company_whatsapp: v.companyWhatsapp || null,
      company_email: v.companyEmail || null,
      institutional_text: v.institutionalText || null,
      default_validity_days: v.defaultValidityDays,
      default_seller_id: v.defaultSellerId || null,
      gemini_model: v.geminiModel || null,
      ai_analysis_enabled: v.aiAnalysisEnabled,
      default_services: v.defaultServices,
      default_warranties: v.defaultWarranties,
      default_financial_assumptions: v.defaultFinancialAssumptions,
    })
    .eq("id", true);

  if (error) return { sucesso: false, erro: error.message };

  revalidatePath("/painel/configuracoes");
  return { sucesso: true };
}
