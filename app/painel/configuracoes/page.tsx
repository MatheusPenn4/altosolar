import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesForm } from "./_components/ConfiguracoesForm";
import { UsoGeminiCard } from "./_components/UsoGeminiCard";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();
  const { data: vendedores } = await supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Dados institucionais e padrões usados nas novas propostas.</p>
      </div>
      <UsoGeminiCard limiteDiario={settings?.gemini_daily_limit ?? null} />
      <ConfiguracoesForm settings={settings} vendedores={vendedores ?? []} />
    </div>
  );
}
