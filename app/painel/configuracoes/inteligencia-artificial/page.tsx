import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState } from "@/app/painel/_components/ui/Card";
import { ShieldAlert } from "lucide-react";
import { SubNavConfiguracoes } from "@/app/painel/configuracoes/_components/SubNavConfiguracoes";
import { COLUNAS_CONFIG_SEM_CREDENCIAL } from "@/lib/ai/constantes";
import { ProviderConfigCard } from "./_components/ProviderConfigCard";
import { ProviderConfigForm } from "./_components/ProviderConfigForm";
import { ConfiguracoesGlobaisForm } from "./_components/ConfiguracoesGlobaisForm";
import { EventosRecentes } from "./_components/EventosRecentes";

export const metadata = { title: "Inteligência Artificial" };

export default async function InteligenciaArtificialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!perfil?.is_admin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inteligência Artificial</h1>
          <p className="text-sm text-slate-500">Gerencie os provedores usados na análise automática dos documentos.</p>
        </div>
        <SubNavConfiguracoes ativo="ia" />
        <EmptyState
          icon={<ShieldAlert className="h-8 w-8" />}
          title="Acesso restrito"
          description="Somente administradores podem gerenciar as integrações de IA. Peça para um administrador liberar seu acesso, se necessário."
        />
      </div>
    );
  }

  const [{ data: configs }, { data: settings }, { data: eventos }] = await Promise.all([
    supabase
      .from("ai_provider_configs")
      .select(COLUNAS_CONFIG_SEM_CREDENCIAL)
      .order("prioridade", { ascending: true }),
    supabase
      .from("app_settings")
      .select("ai_fallback_automatico, ai_max_tentativas_por_provider, ai_max_fallbacks, ai_timeout_ms")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("ai_events")
      // ai_events tem duas FKs para ai_provider_configs (provider_config_id e
      // fallback_de_config_id) — precisa desambiguar qual delas embutir.
      .select("id, provider, modelo, operacao, resultado, categoria_erro, mensagem, created_at, ai_provider_configs!provider_config_id(nome)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inteligência Artificial</h1>
          <p className="text-sm text-slate-500">
            Gerencie os provedores usados na análise automática dos documentos (orçamentos e faturas).
          </p>
        </div>
        <ProviderConfigForm modo="criar" />
      </div>

      <SubNavConfiguracoes ativo="ia" />

      <div className="flex flex-col gap-4">
        {(configs ?? []).length === 0 ? (
          <EmptyState
            title="Nenhuma integração cadastrada"
            description="Enquanto nenhuma integração for cadastrada aqui, o sistema continua usando GEMINI_API_KEY/GEMINI_MODEL das variáveis de ambiente, se configuradas."
          />
        ) : (
          (configs ?? []).map((config) => <ProviderConfigCard key={config.id} config={config} />)
        )}
      </div>

      <ConfiguracoesGlobaisForm
        valoresIniciais={{
          fallbackAutomatico: settings?.ai_fallback_automatico ?? true,
          maxTentativasPorProvider: settings?.ai_max_tentativas_por_provider ?? 2,
          maxFallbacks: settings?.ai_max_fallbacks ?? 3,
          timeoutMs: settings?.ai_timeout_ms ?? 45000,
        }}
      />

      <Card>
        <CardHeader
          title="Eventos recentes"
          description="Últimas execuções (análises e testes de conexão) — sem dados sensíveis."
        />
        <EventosRecentes eventos={eventos ?? []} />
      </Card>
    </div>
  );
}
