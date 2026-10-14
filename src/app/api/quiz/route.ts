import { NextResponse, type NextRequest } from "next/server";
import { leadSchema } from "@/lib/validation";
import { saveLead } from "@/server/leads";
import { buildWhatsappLink } from "@/server/whatsapp";
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
  if (!rateLimit(`quiz:${ipHash}`, 8, 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Verifique os dados informados." }, { status: 400 });
  }

  // Sinais de robô: aceita silenciosamente (não cria lead) para não dar pistas.
  if (looksLikeBotSubmission({ hp: parsed.data.hp, elapsedMs: parsed.data.elapsedMs })) {
    return NextResponse.json({ ok: true, whatsappUrl: null });
  }

  try {
    const lead = await saveLead(parsed.data, ip);
    const whatsappUrl = buildWhatsappLink(lead);
    log.info("quiz", "lead registrado", { sessionId: lead.sessionId, uf: lead.estado });
    return NextResponse.json({ ok: true, whatsappUrl });
  } catch (err) {
    // Não finge que salvou quando ocorre erro real.
    log.error("quiz", "falha ao salvar lead", { error: err instanceof Error ? err.message : "erro" });
    return NextResponse.json({ error: "Não foi possível registrar seus dados agora. Tente novamente em instantes." }, { status: 500 });
  }
}
