"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-strong border-b border-hair shadow-card"
          : "border-b border-transparent",
      )}
    >
      <div
        className={cn(
          "container flex items-center justify-between transition-all duration-300",
          scrolled ? "h-16" : "h-20",
        )}
      >
        <Link
          href="#inicio"
          aria-label="Alto Solar - início"
          className="flex items-center"
        >
          <Logo priority height={scrolled ? 52 : 64} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={WA.orcamento()}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp"
            data-track-source="header"
            className="hidden rounded-full bg-grad-blue px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-glow transition-transform duration-300 hover:-translate-y-0.5 sm:inline-flex"
          >
            Solicitar Orçamento
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hair text-white lg:hidden"
            aria-label="Abrir menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-hair glass-strong lg:hidden"
          >
            <nav className="container flex flex-col gap-1 py-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
              <a
                href={WA.orcamento()}
                target="_blank"
                rel="noopener noreferrer"
                data-track="whatsapp"
                data-track-source="header_mobile"
                className="mt-2 rounded-full bg-grad-blue px-5 py-3 text-center text-sm font-semibold text-ink-950"
              >
                Solicitar Orçamento
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
