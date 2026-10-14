import "server-only";

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Taxa do serviço de intermediação em centavos (configurável). Padrão R$ 249,90. */
export function feeCents(): number {
  const raw = Number(process.env.INTERMEDIATION_FEE_CENTS);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 24990;
}

/** Telefone do WhatsApp comercial (só dígitos, formato internacional). Null se não configurado. */
export function whatsappPhone(): string | null {
  const raw = (process.env.WHATSAPP_PHONE || process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/\D/g, "");
  return raw.length >= 11 ? raw : null;
}

export const isProductionDeploy = () =>
  process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);

/**
 * Modo da adquirente (PIX):
 * - live: BRAVOPAY_API_KEY definida
 * - mock: BRAVOPAY_MODE=mock (PIX fictício para testar o fluxo) — bloqueado em produção
 * - disabled: sem chave → checkout responde erro claro (não cria cobrança impagável)
 */
export function paymentMode(): "live" | "mock" | "disabled" {
  if (process.env.BRAVOPAY_MODE === "mock") return isProductionDeploy() ? "disabled" : "mock";
  return process.env.BRAVOPAY_API_KEY ? "live" : "disabled";
}

export type EnvCheck = { key: string; ok: boolean; required: boolean; hint: string };

/** Diagnóstico exibido no admin (nunca expõe valores, apenas presença). */
export function envHealth(): EnvCheck[] {
  const has = (k: string) => Boolean(process.env[k]);
  return [
    { key: "DATABASE_URL", ok: has("DATABASE_URL"), required: true, hint: "Postgres (Neon) — conexão pooled" },
    { key: "DATABASE_URL_UNPOOLED", ok: has("DATABASE_URL_UNPOOLED"), required: true, hint: "Postgres — conexão direta (migrations)" },
    { key: "NEXT_PUBLIC_SITE_URL", ok: has("NEXT_PUBLIC_SITE_URL"), required: true, hint: "URL pública do site (sem barra final)" },
    { key: "AUTH_SECRET", ok: has("AUTH_SECRET"), required: true, hint: "Segredo para sessões/hashes (32+ bytes)" },
    { key: "ADMIN_EMAIL", ok: has("ADMIN_EMAIL"), required: true, hint: "E-mail do primeiro admin (bootstrap)" },
    { key: "ADMIN_PASSWORD_HASH", ok: has("ADMIN_PASSWORD_HASH"), required: true, hint: "Hash da senha do admin (npm run admin:hash)" },
    { key: "WHATSAPP_PHONE", ok: Boolean(whatsappPhone()), required: true, hint: "WhatsApp comercial, formato internacional só dígitos" },
    { key: "BRAVOPAY_API_KEY", ok: has("BRAVOPAY_API_KEY") || paymentMode() === "mock", required: true, hint: "Chave da adquirente (PIX do checkout). Sem ela o checkout não gera cobrança" },
    { key: "BRAVOPAY_WEBHOOK_SECRET", ok: has("BRAVOPAY_WEBHOOK_SECRET"), required: true, hint: "Segredo do webhook (confirma o pagamento automaticamente)" },
    { key: "NEXT_PUBLIC_META_PIXEL_ID", ok: has("NEXT_PUBLIC_META_PIXEL_ID"), required: false, hint: "Meta Pixel (opcional)" },
    { key: "NEXT_PUBLIC_GA_ID", ok: has("NEXT_PUBLIC_GA_ID"), required: false, hint: "Google Analytics 4 (opcional)" },
  ];
}
