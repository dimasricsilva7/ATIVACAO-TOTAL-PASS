/**
 * Disparo de eventos do Meta Pixel e GA4 no cliente. Seguro mesmo sem os scripts
 * carregados (checa window.fbq / window.gtag). NUNCA envie nome, telefone ou e-mail
 * em parâmetros personalizados.
 */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

type Standard = "QuizStarted" | "Lead" | "Contact" | "InitiateCheckout" | "Purchase";

/**
 * `value`/`currency` só devem ser enviados em InitiateCheckout/Purchase (valor da
 * compra). Nunca envie nome/telefone/e-mail em parâmetros personalizados.
 */
export function trackPixel(event: Standard, params?: { value?: number; currency?: string }) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      if (event === "QuizStarted") window.fbq("trackCustom", "QuizStarted");
      else window.fbq("track", event, params ?? undefined);
    }
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, params ?? undefined);
    }
  } catch {
    /* analytics nunca deve quebrar o fluxo */
  }
}
