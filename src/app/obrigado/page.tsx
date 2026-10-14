import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/server/settings";
import { formatBRL } from "@/utils/format";
import { PixelFire } from "./PixelFire";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmação — Ativação TotalPass",
  robots: { index: false, follow: false },
};

type SP = Record<string, string | string[] | undefined>;

export default async function ObrigadoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const numero = typeof sp.numero === "string" ? sp.numero : "";

  const order = /^ATP-[A-Z0-9]{6,12}$/.test(numero)
    ? await db.order.findUnique({ where: { numero }, select: { status: true, method: true, amountCents: true } }).catch(() => null)
    : null;
  const settings = await getSettings();

  const paid = order?.status === "PAID";
  const crediarioPending = order?.method === "CREDIARIO" && order?.status === "PENDING";

  const title = paid ? "Pagamento confirmado!" : crediarioPending ? settings.crediarioSuccessTitle : "Recebemos seu pedido!";
  const message = paid
    ? "Recebemos o seu pagamento. Nossa equipe vai iniciar a ativação da sua inclusão no TotalPass e entrar em contato pelo WhatsApp."
    : crediarioPending
      ? settings.crediarioSuccessMessage
      : "Estamos processando o seu pedido. Em instantes nossa equipe entra em contato.";

  const Icon = paid ? BadgeCheck : crediarioPending ? CreditCard : Clock;

  return (
    <main className="bg-stage grid min-h-[100svh] place-items-center px-5 py-10">
      <PixelFire event={paid ? "Purchase" : crediarioPending ? "Lead" : null} value={order ? order.amountCents / 100 : undefined} />
      <section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-card">
        <div className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full bg-brand-gradient text-white shadow-glow">
          <Icon className="h-10 w-10" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-ink-600">{message}</p>

        {paid && <p className="mt-5 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-bold text-brand-800">Valor: {formatBRL(order.amountCents)}</p>}
        {numero && <p className="mt-4 text-xs text-ink-400">Pedido {numero}</p>}

        <Link href="/" className="mt-7 inline-block rounded-2xl border-2 border-ink-200 px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50">
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
