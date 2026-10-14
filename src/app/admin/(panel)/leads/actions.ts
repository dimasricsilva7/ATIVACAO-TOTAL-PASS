"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { withAdmin, refreshAdmin, type ActionResult } from "@/server/admin/guard";

const STATUSES = ["NOVO", "CONVERSA_INICIADA", "EM_ATENDIMENTO", "ATIVADO", "NAO_CONVERTIDO"] as const;

const statusSchema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(STATUSES),
  // Só na ativação: valor efetivamente recebido (reais, com vírgula ou ponto) e data.
  valor: z.string().trim().max(20).optional().nullable(),
  data: z.string().trim().max(10).optional().nullable(),
});

function parseReaisToCents(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Altera o status comercial de um lead. A receita só é registrada ao marcar ATIVADO com valor. */
export async function updateLeadStatus(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withAdmin("EDITOR", async () => {
    const parsed = statusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      valor: formData.get("valor"),
      data: formData.get("data"),
    });
    if (!parsed.success) return { error: "Dados inválidos." };
    const { id, status, valor, data } = parsed.data;

    const patch: Record<string, unknown> = { status };
    if (status === "ATIVADO") {
      const cents = parseReaisToCents(valor);
      // Receita nunca é presumida: exige valor informado explicitamente.
      if (cents === null) return { error: "Informe o valor efetivamente recebido para concluir a ativação." };
      patch.valorRecebido = cents;
      patch.confirmadoEm = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(`${data}T12:00:00-03:00`) : new Date();
    } else {
      // Ao sair de ATIVADO, limpa a receita associada.
      patch.valorRecebido = null;
      patch.confirmadoEm = null;
    }

    await db.lead.update({ where: { id }, data: patch });
    refreshAdmin();
    return { ok: true, message: "Status atualizado." };
  });
}

const spendSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  campanha: z.string().trim().max(120).optional().nullable(),
  valor: z.string().trim().min(1, "Informe o valor"),
});

/** Registra gasto de anúncios (para cálculo de custo por lead e por ativação). */
export async function addAdSpend(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withAdmin("EDITOR", async () => {
    const parsed = spendSchema.safeParse({ data: formData.get("data"), campanha: formData.get("campanha"), valor: formData.get("valor") });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const cents = parseReaisToCents(parsed.data.valor);
    if (cents === null || cents <= 0) return { error: "Valor de gasto inválido." };
    await db.adSpend.create({
      data: { data: new Date(`${parsed.data.data}T12:00:00-03:00`), campanha: parsed.data.campanha || null, valorCents: cents },
    });
    refreshAdmin();
    return { ok: true, message: "Gasto registrado." };
  });
}
