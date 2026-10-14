import { NextResponse, type NextRequest } from "next/server";
import { getOrderStatus } from "@/server/orders";
import { isSameOrigin } from "@/lib/request";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const numero = req.nextUrl.searchParams.get("numero") ?? "";
  if (!/^ATP-[A-Z0-9]{6,12}$/.test(numero)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const result = await getOrderStatus(numero);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: result.status });
}
