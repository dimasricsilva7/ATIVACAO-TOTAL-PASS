import "server-only";
import { whatsappPhone as envWhatsappPhone } from "@/lib/env";
import { labelFor } from "@/lib/quiz";

/** Resolve o telefone comercial: primeiro o configurado no admin, depois a env. */
export function resolveWhatsappPhone(settingsPhone: string | null | undefined): string | null {
  const fromSettings = (settingsPhone ?? "").replace(/\D/g, "");
  if (fromSettings.length >= 11) return fromSettings;
  return envWhatsappPhone();
}

/**
 * Monta o link oficial wa.me com o telefone comercial e a mensagem pré-preenchida.
 * O usuário ainda precisa enviar a mensagem no próprio WhatsApp.
 * Retorna null se não houver telefone comercial configurado.
 */
export function buildWhatsappLink(
  lead: { nome: string; cidade?: string | null; estado?: string | null; objetivo?: string | null },
  phone: string | null
): string | null {
  if (!phone) return null;

  const local = [lead.cidade, lead.estado].filter(Boolean).join("/");
  const objetivo = labelFor("objetivo", lead.objetivo);

  const linhas = [
    `Olá! Meu nome é ${lead.nome}.`,
    "Preenchi o quiz e quero ativar meu acesso ao TotalPass.",
    local ? `Região: ${local}.` : null,
    lead.objetivo ? `Objetivo: ${objetivo}` : null,
  ].filter(Boolean);

  const msg = encodeURIComponent(linhas.join("\n"));
  return `https://wa.me/${phone}?text=${msg}`;
}
