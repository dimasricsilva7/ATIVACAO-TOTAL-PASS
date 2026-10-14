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
  merchantDescriptor: z.string().trim().min(2, "Informe o nome da cobrança").max(120),
  productName: z.string().trim().min(2).max(120),
  productDescription: z.string().trim().min(2).max(400),
  priceReais: z.string().trim().min(1, "Informe o valor"),
  checkoutHeadline: z.string().trim().min(2).max(120),
  checkoutSubheadline: z.string().trim().min(2).max(200),
});

export async function updateSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async () => {
    const parsed = schema.safeParse({
      ctaMode: formData.get("ctaMode"),
      merchantDescriptor: formData.get("merchantDescriptor"),
      productName: formData.get("productName"),
      productDescription: formData.get("productDescription"),
      priceReais: formData.get("priceReais"),
      checkoutHeadline: formData.get("checkoutHeadline"),
      checkoutSubheadline: formData.get("checkoutSubheadline"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    const priceCents = parseReaisToCents(parsed.data.priceReais);
    if (priceCents === null) return { error: "Valor da taxa inválido." };

    const { priceReais: _omit, ...rest } = parsed.data;
    void _omit;
    const data = { ...rest, priceCents };
    await db.settings.upsert({ where: { id: "app" }, create: { id: "app", ...data }, update: data });
    refreshAdmin();
    return { ok: true, message: "Configurações salvas." };
  });
}
