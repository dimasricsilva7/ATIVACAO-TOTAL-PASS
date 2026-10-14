import "server-only";
import { db } from "@/lib/db";

export type AppSettings = {
  ctaMode: "whatsapp" | "checkout";
  whatsappPhone: string;
  merchantDescriptor: string;
  productName: string;
  productDescription: string;
  priceCents: number;
  checkoutHeadline: string;
  checkoutSubheadline: string;
  crediarioEnabled: boolean;
  crediarioMaxInstallments: number;
  crediarioInstructions: string;
  crediarioMethodLabel: string;
  crediarioMethodSubtitle: string;
  crediarioSectionTitle: string;
  crediarioProtocolLabel: string;
  crediarioProtocolPlaceholder: string;
  crediarioValidityLabel: string;
  crediarioValidityPlaceholder: string;
  crediarioCpfLabel: string;
  crediarioCpfPlaceholder: string;
  crediarioInstallmentsLabel: string;
  crediarioButtonLabel: string;
  crediarioSuccessTitle: string;
  crediarioSuccessMessage: string;
};

/** Campos de texto do crediário editáveis no admin (nomes das colunas Settings). */
export const CREDIARIO_TEXT_KEYS = [
  "crediarioMethodLabel",
  "crediarioMethodSubtitle",
  "crediarioSectionTitle",
  "crediarioInstructions",
  "crediarioProtocolLabel",
  "crediarioProtocolPlaceholder",
  "crediarioValidityLabel",
  "crediarioValidityPlaceholder",
  "crediarioCpfLabel",
  "crediarioCpfPlaceholder",
  "crediarioInstallmentsLabel",
  "crediarioButtonLabel",
  "crediarioSuccessTitle",
  "crediarioSuccessMessage",
] as const;

const DEFAULTS: AppSettings = {
  ctaMode: "whatsapp",
  whatsappPhone: "",
  merchantDescriptor: "BRASIL PAY SERVIÇOS LTDA",
  productName: "Ativação TotalPass",
  productDescription: "Inclusão de 1 CPF no programa de benefícios TotalPass, com ativação e acompanhamento da nossa equipe.",
  priceCents: 24990,
  checkoutHeadline: "Ative seu acesso ao TotalPass",
  checkoutSubheadline: "Pagamento único e seguro via Pix. Ativação da sua inclusão no programa.",
  crediarioEnabled: false,
  crediarioMaxInstallments: 12,
  crediarioInstructions: "Informe os dados do seu crediário. Após a análise, nossa equipe confirma a ativação do seu acesso.",
  crediarioMethodLabel: "Crediário",
  crediarioMethodSubtitle: "Até {parcelas}x",
  crediarioSectionTitle: "Dados do crediário",
  crediarioProtocolLabel: "Número do protocolo (16 dígitos)",
  crediarioProtocolPlaceholder: "0000 0000 0000 0000",
  crediarioValidityLabel: "Validade (MM/AA)",
  crediarioValidityPlaceholder: "MM/AA",
  crediarioCpfLabel: "3 últimos do CPF",
  crediarioCpfPlaceholder: "000",
  crediarioInstallmentsLabel: "Parcelamento",
  crediarioButtonLabel: "Enviar pedido no crediário",
  crediarioSuccessTitle: "Pedido enviado!",
  crediarioSuccessMessage: "Recebemos seu pedido no crediário. Nossa equipe vai analisar e confirmar a ativação do seu acesso, e entrar em contato pelo WhatsApp.",
};

/**
 * Lê as configurações (linha singleton). Cria com os padrões no primeiro acesso.
 * Se o banco estiver indisponível, devolve os padrões para não quebrar as páginas públicas.
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const row = await db.settings.upsert({ where: { id: "app" }, create: { id: "app" }, update: {} });
    const mode = row.ctaMode === "checkout" ? "checkout" : "whatsapp";
    return {
      ctaMode: mode,
      whatsappPhone: row.whatsappPhone,
      merchantDescriptor: row.merchantDescriptor,
      productName: row.productName,
      productDescription: row.productDescription,
      priceCents: row.priceCents,
      checkoutHeadline: row.checkoutHeadline,
      checkoutSubheadline: row.checkoutSubheadline,
      crediarioEnabled: row.crediarioEnabled,
      crediarioMaxInstallments: row.crediarioMaxInstallments,
      ...(Object.fromEntries(CREDIARIO_TEXT_KEYS.map((k) => [k, row[k]])) as Record<(typeof CREDIARIO_TEXT_KEYS)[number], string>),
    };
  } catch {
    return DEFAULTS;
  }
}

export { DEFAULTS as SETTINGS_DEFAULTS };
