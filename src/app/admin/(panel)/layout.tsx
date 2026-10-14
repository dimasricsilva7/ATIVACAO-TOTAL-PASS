import type { Metadata } from "next";
import { LogOut, BarChart3 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Painel — Ativação TotalPass", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-[100svh] bg-ink-100">
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><BarChart3 className="h-5 w-5" aria-hidden /></span>
            <span className="text-sm font-bold text-ink-900">Painel de conversão</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-500 sm:inline">{admin.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50">
                <LogOut className="h-4 w-4" aria-hidden /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
