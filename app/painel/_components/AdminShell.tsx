"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { sairAction } from "@/app/painel/actions";

const NAV = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/painel/clientes", label: "Clientes", icon: Users },
  { href: "/painel/propostas", label: "Propostas", icon: FileText },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({
  children,
  nomeUsuario,
}: {
  children: React.ReactNode;
  nomeUsuario: string;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink-950 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <Logo height={32} />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const ativo = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  ativo ? "bg-brand-blue/15 text-brand-cyan" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/20 text-xs font-semibold text-brand-cyan">
              {nomeUsuario.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{nomeUsuario}</span>
          </div>
          <form action={sairAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Topbar mobile */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Logo height={28} />
        <button onClick={() => setMenuAberto(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {menuAberto && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-72 bg-ink-950 p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo height={28} />
              <button onClick={() => setMenuAberto(false)} className="text-white/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5"
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                );
              })}
              <form action={sairAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  Sair
                </button>
              </form>
            </nav>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMenuAberto(false)} />
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

