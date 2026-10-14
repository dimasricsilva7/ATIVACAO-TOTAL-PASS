import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/server/settings";
import { paymentMode } from "@/lib/env";
import { formatBRL } from "@/utils/format";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ativação TotalPass — Pagamento",
  description: "Finalize a ativação do seu acesso ao TotalPass com pagamento seguro via Pix.",
  robots: { index: false, follow: false },
};

type SP = Record<string, string | string[] | undefined>;

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sid = typeof sp.sid === "string" ? sp.sid : null;
  const settings = await getSettings();

  let prefill: { nome: string; email: string; telefone: string } | null = null;
  if (sid && /^[A-Za-z0-9_-]{16,64}$/.test(sid)) {
    const lead = await db.lead
      .findUnique({ where: { sessionId: sid }, select: { nome: true, email: true, telefone: true } })
      .catch(() => null);
    if (lead) prefill = { nome: lead.nome, email: lead.email, telefone: lead.telefone };
  }

  return (
    <main className="bg-stage min-h-[100svh]">
      <CheckoutClient
        sessionId={sid}
        prefill={prefill}
        productName={settings.productName}
        productDescription={settings.productDescription}
        priceBRL={formatBRL(settings.priceCents)}
        priceCents={settings.priceCents}
        merchantDescriptor={settings.merchantDescriptor}
        headline={settings.checkoutHeadline}
        subheadline={settings.checkoutSubheadline}
        pixAvailable={paymentMode() !== "disabled"}
        crediario={{
          enabled: settings.crediarioEnabled,
          maxInstallments: settings.crediarioMaxInstallments,
          instructions: settings.crediarioInstructions,
          methodLabel: settings.crediarioMethodLabel,
          methodSubtitle: settings.crediarioMethodSubtitle.replaceAll("{parcelas}", String(settings.crediarioMaxInstallments)),
          sectionTitle: settings.crediarioSectionTitle,
          protocolLabel: settings.crediarioProtocolLabel,
          protocolPlaceholder: settings.crediarioProtocolPlaceholder,
          validityLabel: settings.crediarioValidityLabel,
          validityPlaceholder: settings.crediarioValidityPlaceholder,
          cpfLabel: settings.crediarioCpfLabel,
          cpfPlaceholder: settings.crediarioCpfPlaceholder,
          installmentsLabel: settings.crediarioInstallmentsLabel,
          buttonLabel: settings.crediarioButtonLabel,
          successTitle: settings.crediarioSuccessTitle,
          successMessage: settings.crediarioSuccessMessage,
        }}
      />
    </main>
  );
}
