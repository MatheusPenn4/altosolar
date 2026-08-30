import { ExternalLink, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/app/painel/_components/ui/Card";
import { inicioDoDiaPacificoUTC, proximoResetGeminiUTC } from "@/lib/domain/janelaGeminiPacifico";
import { HorarioLocal } from "./HorarioLocal";

export async function UsoGeminiCard({ limiteDiario }: { limiteDiario: number | null }) {
  const supabase = await createClient();

  const agora = new Date();
  const inicioHoje = inicioDoDiaPacificoUTC(agora);
  const proximoReset = proximoResetGeminiUTC(agora);
  const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));

  const [{ count: chamadasHoje }, { count: cacheHoje }, { count: chamadasMes }] = await Promise.all([
    supabase
      .from("factory_quotes")
      .select("id", { count: "exact", head: true })
      .eq("extraction_status", "success")
      .eq("extraction_from_cache", false)
      .gte("created_at", inicioHoje.toISOString()),
    supabase
      .from("factory_quotes")
      .select("id", { count: "exact", head: true })
      .eq("extraction_status", "success")
      .eq("extraction_from_cache", true)
      .gte("created_at", inicioHoje.toISOString()),
    supabase
      .from("factory_quotes")
      .select("id", { count: "exact", head: true })
      .eq("extraction_status", "success")
      .eq("extraction_from_cache", false)
      .gte("created_at", inicioMes.toISOString()),
  ]);

  const usadasHoje = chamadasHoje ?? 0;
  const restantes = limiteDiario != null ? Math.max(0, limiteDiario - usadasHoje) : null;
  const percentual = limiteDiario ? Math.min(100, Math.round((usadasHoje / limiteDiario) * 100)) : null;

  return (
    <Card>
      <CardHeader
        title="Uso da API do Gemini"
        description="Estimativa própria, baseada nas análises feitas por este painel."
        action={
          <a
            href="https://aistudio.google.com/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
          >
            Ver painel oficial do Google
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metrica label="Chamadas reais hoje" valor={usadasHoje} />
        <Metrica label="Reaproveitadas do cache hoje" valor={cacheHoje ?? 0} />
        <Metrica label="Chamadas reais este mês" valor={chamadasMes ?? 0} />
        <Metrica
          label="Restantes hoje"
          valor={restantes != null ? restantes : "—"}
          destaque={restantes != null && restantes <= 0}
        />
      </div>

      {limiteDiario != null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{usadasHoje} de {limiteDiario} chamadas usadas hoje</span>
            <span>{percentual}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${percentual !== null && percentual >= 90 ? "bg-red-500" : "bg-brand-blue"}`}
              style={{ width: `${percentual ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Reseta à meia-noite no horário do Pacífico (EUA) — próximo reset:{" "}
        <span className="font-medium text-slate-700">
          <HorarioLocal iso={proximoReset.toISOString()} />
        </span>
      </p>

      {limiteDiario == null && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Configure o &ldquo;limite diário de chamadas&rdquo; acima para ver quantas análises ainda dá para fazer hoje.
        </div>
      )}
    </Card>
  );
}

function Metrica({ label, valor, destaque }: { label: string; valor: string | number; destaque?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${destaque ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
    </div>
  );
}
