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

type Standard = "QuizStarted" | "Lead" | "Contact";

export function trackPixel(event: Standard) {
  try {
    // QuizStarted é custom; Lead e Contact são padrão do Meta.
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      if (event === "QuizStarted") window.fbq("trackCustom", "QuizStarted");
      else window.fbq("track", event);
    }
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event);
    }
  } catch {
    /* analytics nunca deve quebrar o fluxo */
  }
}
