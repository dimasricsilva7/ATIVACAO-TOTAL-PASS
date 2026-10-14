import { NextResponse, type NextRequest } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { createCheckout } from "@/server/orders";
import { paymentMode } from "@/lib/env";
import { isSameOrigin, getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/crypto";
import { isScriptClient, looksLikeBotSubmission } from "@/lib/security";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Requisição não autorizada." }, { status: 403 });
  if (isScriptClient(req.headers.get("user-agent"))) return NextResponse.json({ error: "Requisição não autorizada." }, { status: 403 });

  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip) ?? "anon";
  if (!rateLimit(`checkout:${ipHash}`, 6, 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });

  if (paymentMode() === "disabled") {
    log.warn("checkout", "tentativa sem adquirente configurada");
    return NextResponse.json({ error: "Pagamento indisponível no momento. Fale com o nosso atendimento." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Verifique os dados." }, { status: 400 });

  if (looksLikeBotSubmission({ hp: parsed.data.hp, elapsedMs: parsed.data.elapsedMs })) {
    return NextResponse.json({ error: "Não foi possível processar. Tente novamente." }, { status: 400 });
  }

  try {
    const result = await createCheckout(parsed.data, ip);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error("checkout", "falha ao gerar cobrança", { error: err instanceof Error ? err.message : "erro" });
    return NextResponse.json({ error: "Não foi possível gerar a cobrança agora. Tente novamente em instantes." }, { status: 502 });
  }
}
