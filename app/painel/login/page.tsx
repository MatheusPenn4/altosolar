"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/app/painel/_components/ui/Button";
import { Input } from "@/app/painel/_components/ui/Field";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro(
        error.message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente em instantes."
      );
      return;
    }

    const proximo = searchParams.get("proximo") || "/painel";
    router.replace(proximo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo height={48} priority />
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-ink-900 p-7 shadow-2xl"
        >
          <h1 className="mb-1 text-center text-lg font-semibold text-white">Painel administrativo</h1>
          <p className="mb-6 text-center text-sm text-muted">Entre com seu e-mail e senha</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">E-mail</label>
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="voce@altosolar.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Senha</label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>

            {erro && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>
            )}

            <Button type="submit" loading={carregando} className="mt-2 w-full">
              {carregando ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
