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
};

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
      crediarioInstructions: row.crediarioInstructions,
    };
  } catch {
    return DEFAULTS;
  }
}

export { DEFAULTS as SETTINGS_DEFAULTS };
