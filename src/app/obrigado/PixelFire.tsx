"use client";

import { useEffect, useRef } from "react";
import { trackPixel } from "@/lib/pixel";

/**
 * Dispara o evento de conversão uma única vez ao abrir a página de confirmação.
 * Purchase (pagamento confirmado) com valor; Lead (pedido no crediário, em análise).
 */
export function PixelFire({ event, value }: { event: "Purchase" | "Lead" | null; value?: number }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !event) return;
    fired.current = true;
    trackPixel(event, event === "Purchase" && value ? { value, currency: "BRL" } : undefined);
  }, [event, value]);
  return null;
}
