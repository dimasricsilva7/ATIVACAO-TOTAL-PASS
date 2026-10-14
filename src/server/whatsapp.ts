import "server-only";
import { whatsappPhone } from "@/lib/env";
import { labelFor } from "@/lib/quiz";

/**
 * Monta o link oficial wa.me com o telefone comercial e a mensagem pré-preenchida.
 * O usuário ainda precisa enviar a mensagem no próprio WhatsApp.
 * Retorna null se o telefone comercial não estiver configurado.
 */
export function buildWhatsappLink(lead: {
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  objetivo?: string | null;
}): string | null {
  const phone = whatsappPhone();
  if (!phone) return null;

  const local = [lead.cidade, lead.estado].filter(Boolean).join("/");
  const objetivo = labelFor("objetivo", lead.objetivo);

  const linhas = [
    `Olá! Meu nome é ${lead.nome}.`,
    "Preenchi o quiz e quero conhecer as condições para treinar com TotalPass.",
    local ? `Região: ${local}.` : null,
    lead.objetivo ? `Objetivo: ${objetivo}` : null,
  ].filter(Boolean);

  const msg = encodeURIComponent(linhas.join("\n"));
  return `https://wa.me/${phone}?text=${msg}`;
}
