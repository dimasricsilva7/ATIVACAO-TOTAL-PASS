import "server-only";
import crypto from "crypto";
import QRCode from "qrcode";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { getSettings } from "@/server/settings";
import { createPixTransaction, verifyTransaction } from "@/lib/payments/bravopay";
import type { CheckoutInput } from "@/lib/validation";
import { log } from "@/lib/log";

function makeOrderNumber(): string {
  const base = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `ATP-${base}${rand}`;
}

export type CheckoutResult = {
  numero: string;
  amountCents: number;
  merchantDescriptor: string;
  pix: { copyPaste: string; qrDataUrl: string; expiresAt: string | null };
};

/**
 * Cria o pedido e gera o PIX. Gera o PIX ANTES de persistir para não deixar
 * pedidos órfãos quando a adquirente não está configurada. O preço e o descritor
 * da cobrança vêm das configurações (editáveis no admin).
 */
export async function createCheckout(input: CheckoutInput, ip: string | null): Promise<CheckoutResult> {
  const settings = await getSettings();
  const amountCents = settings.priceCents;
  const numero = makeOrderNumber();

  const tx = await createPixTransaction({
    amountCents,
    idempotencyKey: numero,
    externalReference: numero,
    description: settings.productName,
    customer: { name: input.nome, email: input.email, cpf: input.cpf, phone: input.telefone },
    metadata: { numero, sessionId: input.sessionId ?? "" },
    utm: {
      source: input.utm?.source,
      medium: input.utm?.medium,
      campaign: input.utm?.campaign,
      content: input.utm?.content,
      term: input.utm?.term,
      fbclid: input.utm?.fbclid,
    },
  });

  const pixCopyPaste = tx.pix?.copy_paste ?? null;
  const pixExpiresAt = tx.pix?.expires_at ? new Date(tx.pix.expires_at) : null;

  const lead = input.sessionId ? await db.lead.findUnique({ where: { sessionId: input.sessionId }, select: { id: true } }).catch(() => null) : null;

  await db.order.create({
    data: {
      numero,
      sessionId: input.sessionId ?? null,
      leadId: lead?.id ?? null,
      nome: input.nome,
      cpf: input.cpf,
      email: input.email,
      telefone: input.telefone,
      amountCents,
      merchantDescriptor: settings.merchantDescriptor,
      status: "PENDING",
      txId: tx.id,
      pixCopyPaste,
      pixExpiresAt,
      utmSource: input.utm?.source ?? null,
      utmMedium: input.utm?.medium ?? null,
      utmCampaign: input.utm?.campaign ?? null,
      utmContent: input.utm?.content ?? null,
      utmTerm: input.utm?.term ?? null,
      fbclid: input.utm?.fbclid ?? null,
      ipHash: hashIp(ip),
    },
  });

  const qrDataUrl = pixCopyPaste
    ? await QRCode.toDataURL(pixCopyPaste, { width: 320, margin: 1, errorCorrectionLevel: "M" }).catch(() => "")
    : "";

  return {
    numero,
    amountCents,
    merchantDescriptor: settings.merchantDescriptor,
    pix: { copyPaste: pixCopyPaste ?? "", qrDataUrl, expiresAt: pixExpiresAt?.toISOString() ?? null },
  };
}

/**
 * Status do pedido para o polling do cliente. Lê do banco (o webhook atualiza) e,
 * em modo real, tenta reconciliar com a adquirente para não depender só do webhook.
 */
export async function getOrderStatus(numero: string): Promise<{ status: OrderStatus; amountCents: number } | null> {
  const order = await db.order.findUnique({ where: { numero }, select: { status: true, amountCents: true } });
  if (!order) return null;
  if (order.status !== "PENDING") return order;

  try {
    const check = await verifyTransaction(numero, order.amountCents);
    if (check.found && check.tx?.status === "PAID" && check.amountMatches) {
      await markOrderPaid(numero, check.tx.paid_at ? new Date(check.tx.paid_at) : new Date());
      return { status: "PAID", amountCents: order.amountCents };
    }
  } catch {
    /* sem gateway/offline: mantém o status do banco */
  }
  return order;
}

export async function markOrderPaid(numero: string, paidAt: Date) {
  await db.order.updateMany({ where: { numero, status: "PENDING" }, data: { status: "PAID", paidAt } });
  // Avança o lead ligado para "ativação concluída" (confirmação por pagamento real).
  const order = await db.order.findUnique({ where: { numero }, select: { leadId: true, amountCents: true } });
  if (order?.leadId) {
    await db.lead
      .update({ where: { id: order.leadId }, data: { status: "ATIVADO", valorRecebido: order.amountCents, confirmadoEm: paidAt } })
      .catch(() => {});
  }
  log.info("order", "pedido pago", { numero });
}

export async function setOrderStatusFromWebhook(numero: string, status: OrderStatus, paidAt?: Date | null) {
  if (status === "PAID") return markOrderPaid(numero, paidAt ?? new Date());
  await db.order.updateMany({ where: { numero, status: "PENDING" }, data: { status } });
}
