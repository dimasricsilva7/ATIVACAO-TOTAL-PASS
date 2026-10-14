import { NextResponse, type NextRequest } from "next/server";
import { processWebhook, statusFromEvent } from "@/lib/payments/bravopay";
import { setOrderStatusFromWebhook } from "@/server/orders";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Webhook da adquirente: confirma o pagamento automaticamente. A assinatura HMAC
 * é verificada antes de qualquer processamento (nunca confiar no payload bruto).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const result = processWebhook(raw, req.headers);
  if (!result.ok) {
    log.warn("webhook", "webhook recusado", { reason: result.reason });
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const numero = result.event.data.external_reference;
  const status = statusFromEvent(result.event);
  if (!numero) return NextResponse.json({ ok: true, ignored: "sem external_reference" });

  try {
    if (status === "PAID") await setOrderStatusFromWebhook(numero, "PAID", result.event.data.paid_at ? new Date(result.event.data.paid_at) : new Date());
    else if (status === "EXPIRED") await setOrderStatusFromWebhook(numero, "EXPIRED");
    else if (status === "REFUNDED" || status === "CHARGEBACK" || status === "FAILED") await setOrderStatusFromWebhook(numero, "CANCELED");
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("webhook", "falha ao processar", { error: err instanceof Error ? err.message : "erro" });
    return NextResponse.json({ error: "processing_error" }, { status: 500 });
  }
}
