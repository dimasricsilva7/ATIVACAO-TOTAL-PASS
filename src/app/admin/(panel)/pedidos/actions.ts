"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/server/orders";
import { withAdminVoid } from "@/server/admin/guard";

const schema = z.object({ numero: z.string().regex(/^ATP-[A-Z0-9]{6,12}$/) });

/** Confirma o pedido manualmente (crediário aprovado ou PIX conferido): marca PAGO e ativa o lead. */
export async function confirmOrder(formData: FormData) {
  await withAdminVoid("EDITOR", async () => {
    const parsed = schema.safeParse({ numero: formData.get("numero") });
    if (!parsed.success) throw new Error("Pedido inválido.");
    await markOrderPaid(parsed.data.numero, new Date());
  });
}

/** Cancela o pedido (crediário recusado / desistência). */
export async function cancelOrder(formData: FormData) {
  await withAdminVoid("EDITOR", async () => {
    const parsed = schema.safeParse({ numero: formData.get("numero") });
    if (!parsed.success) throw new Error("Pedido inválido.");
    await db.order.updateMany({ where: { numero: parsed.data.numero, status: "PENDING" }, data: { status: "CANCELED" } });
  });
}
