import "server-only";
import { revalidatePath } from "next/cache";
import type { AdminRole, AdminUser } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { log } from "@/lib/log";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | undefined;

const RANK: Record<AdminRole, number> = { EDITOR: 1, ADMIN: 2, OWNER: 3 };

const isRedirect = (err: unknown) =>
  (err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT") || (err as Error)?.message === "NEXT_REDIRECT";

/**
 * Executa o corpo de uma Server Action do admin: exige sessão válida e papel mínimo
 * e converte exceções em mensagem amigável. (Server Actions já têm proteção CSRF do Next.)
 */
export async function withAdmin(minRole: AdminRole, fn: (admin: AdminUser) => Promise<ActionResult>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (RANK[admin.role] < RANK[minRole]) return { error: "Você não tem permissão para esta ação." };
  try {
    return await fn(admin);
  } catch (err) {
    if (isRedirect(err)) throw err;
    const message = err instanceof Error ? err.message : "Erro inesperado";
    log.error("admin", "falha em ação", { error: message });
    return { error: message.length < 160 && !/prisma|invocation/i.test(message) ? message : "Não foi possível salvar. Tente novamente." };
  }
}

/** Variante para <form action> simples (sem estado de retorno). Revalida o admin ao final. */
export async function withAdminVoid(minRole: AdminRole, fn: (admin: AdminUser) => Promise<void>): Promise<void> {
  const admin = await requireAdmin();
  if (RANK[admin.role] < RANK[minRole]) throw new Error("Sem permissão");
  await fn(admin);
  revalidatePath("/admin", "layout");
}

export function refreshAdmin() {
  revalidatePath("/admin", "layout");
}
