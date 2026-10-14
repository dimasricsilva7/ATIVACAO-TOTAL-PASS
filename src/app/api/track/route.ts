import { NextResponse, type NextRequest } from "next/server";
import { eventSchema } from "@/lib/validation";
import { recordEvent } from "@/server/events";
import { isSameOrigin, getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ipHash = hashIp(getClientIp(req.headers)) ?? "anon";
  if (!rateLimit(`track:${ipHash}`, 60, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    await recordEvent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    // Persistência indisponível (ex.: banco não configurado): não finge sucesso silencioso,
    // mas o evento de tracking não deve quebrar a experiência — responde 202.
    return NextResponse.json({ ok: false, error: "persist_unavailable" }, { status: 202 });
  }
}
