import { NextResponse, type NextRequest } from "next/server";
import { SCANNER_PATH } from "@/lib/security";
import { ADMIN_COOKIE } from "@/lib/auth/cookie";

/**
 * 1. Varredura de vulnerabilidades → 404 na borda, sem tocar no app.
 * 2. Admin: sem cookie de sessão → login (páginas) ou 401 (API). A validação real
 *    (hash no banco, expiração) acontece no servidor via requireAdmin().
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SCANNER_PATH.test(pathname)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  }

  if (pathname.startsWith("/api/admin")) {
    if (!req.cookies.get(ADMIN_COOKIE)?.value) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!req.cookies.get(ADMIN_COOKIE)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon|icon|robots.txt|sitemap.xml).*)", "/api/admin/:path*"],
};
