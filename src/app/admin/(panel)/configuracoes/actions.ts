"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { withAdmin, refreshAdmin, type ActionResult } from "@/server/admin/guard";

function parseReaisToCents(raw: string): number | null {
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

const schema = z.object({
  ctaMode: z.enum(["whatsapp", "checkout"]),
  whatsappPhone: z.string().trim().max(20).optional().default(""),
  merchantDescriptor: z.string().trim().min(2, "Informe o nome da cobrança").max(120),
  productName: z.string().trim().min(2).max(120),
  productDescription: z.string().trim().min(2).max(400),
  priceReais: z.string().trim().min(1, "Informe o valor"),
  checkoutHeadline: z.string().trim().min(2).max(120),
  checkoutSubheadline: z.string().trim().min(2).max(200),
  crediarioEnabled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  crediarioMaxInstallments: z.coerce.number().int().min(1).max(24),
  crediarioInstructions: z.string().trim().min(1).max(400),
  crediarioMethodLabel: z.string().trim().min(1).max(60),
  crediarioMethodSubtitle: z.string().trim().max(60),
  crediarioSectionTitle: z.string().trim().max(80),
  crediarioProtocolLabel: z.string().trim().min(1).max(80),
  crediarioProtocolPlaceholder: z.string().trim().max(60),
  crediarioValidityLabel: z.string().trim().min(1).max(60),
  crediarioValidityPlaceholder: z.string().trim().max(20),
  crediarioCpfLabel: z.string().trim().min(1).max(60),
  crediarioCpfPlaceholder: z.string().trim().max(20),
  crediarioInstallmentsLabel: z.string().trim().min(1).max(60),
  crediarioButtonLabel: z.string().trim().min(1).max(60),
  crediarioSuccessTitle: z.string().trim().min(1).max(80),
  crediarioSuccessMessage: z.string().trim().min(1).max(400),
});

export async function updateSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async () => {
    const parsed = schema.safeParse({
      ctaMode: formData.get("ctaMode"),
      whatsappPhone: formData.get("whatsappPhone"),
      merchantDescriptor: formData.get("merchantDescriptor"),
      productName: formData.get("productName"),
      productDescription: formData.get("productDescription"),
      priceReais: formData.get("priceReais"),
      checkoutHeadline: formData.get("checkoutHeadline"),
      checkoutSubheadline: formData.get("checkoutSubheadline"),
      crediarioEnabled: formData.get("crediarioEnabled"),
      crediarioMaxInstallments: formData.get("crediarioMaxInstallments"),
      crediarioInstructions: formData.get("crediarioInstructions"),
      crediarioMethodLabel: formData.get("crediarioMethodLabel"),
      crediarioMethodSubtitle: formData.get("crediarioMethodSubtitle"),
      crediarioSectionTitle: formData.get("crediarioSectionTitle"),
      crediarioProtocolLabel: formData.get("crediarioProtocolLabel"),
      crediarioProtocolPlaceholder: formData.get("crediarioProtocolPlaceholder"),
      crediarioValidityLabel: formData.get("crediarioValidityLabel"),
      crediarioValidityPlaceholder: formData.get("crediarioValidityPlaceholder"),
      crediarioCpfLabel: formData.get("crediarioCpfLabel"),
      crediarioCpfPlaceholder: formData.get("crediarioCpfPlaceholder"),
      crediarioInstallmentsLabel: formData.get("crediarioInstallmentsLabel"),
      crediarioButtonLabel: formData.get("crediarioButtonLabel"),
      crediarioSuccessTitle: formData.get("crediarioSuccessTitle"),
      crediarioSuccessMessage: formData.get("crediarioSuccessMessage"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    const priceCents = parseReaisToCents(parsed.data.priceReais);
    if (priceCents === null) return { error: "Valor da taxa inválido." };

    // Normaliza o WhatsApp: se vier sem DDI (10–11 dígitos, Brasil), prefixa 55.
    let whatsappPhone = parsed.data.whatsappPhone.replace(/\D/g, "");
    if (whatsappPhone.length === 10 || whatsappPhone.length === 11) whatsappPhone = `55${whatsappPhone}`;
    if (whatsappPhone && (whatsappPhone.length < 12 || whatsappPhone.length > 15)) {
      return { error: "WhatsApp inválido. Ex.: 11999999999 (DDD + número) ou 5511999999999." };
    }

    const { priceReais: _omit, ...rest } = parsed.data;
    void _omit;
    const data = { ...rest, whatsappPhone, priceCents };
    await db.settings.upsert({ where: { id: "app" }, create: { id: "app", ...data }, update: data });
    refreshAdmin();
    return { ok: true, message: "Configurações salvas." };
  });
}
