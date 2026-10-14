import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin — Entrar", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-[100svh] place-items-center bg-ink-100 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-xl">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Painel administrativo</h1>
        <p className="mt-1 text-sm text-ink-500">Acesso restrito à equipe.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
