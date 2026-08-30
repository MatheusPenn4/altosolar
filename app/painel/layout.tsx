import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/app/painel/_components/AdminShell";
import { ToastProvider } from "@/app/painel/_components/ui/Toast";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel Alto Solar" },
  robots: { index: false, follow: false },
};

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A rota /painel/login não usa este shell (ver app/painel/login/layout.tsx).
  if (!user) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ToastProvider>
      <AdminShell nomeUsuario={profile?.nome || user.email || "Usuário"}>{children}</AdminShell>
    </ToastProvider>
  );
}
