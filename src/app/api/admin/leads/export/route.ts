import { type NextRequest } from "next/server";
import type { LeadStatus, Prisma } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolvePeriod } from "@/server/admin/period";
import { labelFor } from "@/lib/quiz";
import { STATUS_LABEL } from "@/components/admin/ui";
import { formatDate } from "@/utils/format";

export const runtime = "nodejs";

const STATUSES: LeadStatus[] = ["NOVO", "CONVERSA_INICIADA", "EM_ATENDIMENTO", "ATIVADO", "NAO_CONVERTIDO"];

/** Escapa um campo para CSV (RFC 4180): aspas, vírgulas e quebras de linha. */
function csv(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  // Proteção real: valida a sessão no servidor (não confia só no cookie do middleware).
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("unauthorized", { status: 401 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const period = resolvePeriod(sp);
  const campaign = typeof sp.campanha === "string" && sp.campanha ? sp.campanha : null;
  const status = STATUSES.includes(sp.status as LeadStatus) ? (sp.status as LeadStatus) : null;

  const where: Prisma.LeadWhereInput = {
    createdAt: { gte: period.from, lt: period.to },
    ...(campaign ? { utmCampaign: campaign } : {}),
    ...(status ? { status } : {}),
  };

  const leads = await db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 });

  const headers = [
    "data_criacao", "nome", "telefone", "email", "objetivo", "acesso_atual", "preferencia_treino",
    "cidade", "estado", "resposta_taxa", "origem", "utm_source", "utm_medium", "utm_campaign",
    "status", "valor_recebido_reais", "confirmado_em",
  ];

  const rows = leads.map((l) =>
    [
      formatDate(l.createdAt, true),
      l.nome,
      l.telefone,
      l.email,
      labelFor("objetivo", l.objetivo),
      labelFor("acessoAtual", l.acessoAtual),
      labelFor("preferenciaTreino", l.preferenciaTreino),
      l.cidade ?? "",
      l.estado ?? "",
      labelFor("respostaTaxa", l.respostaTaxa),
      l.origem ?? "",
      l.utmSource ?? "",
      l.utmMedium ?? "",
      l.utmCampaign ?? "",
      STATUS_LABEL[l.status],
      l.valorRecebido != null ? (l.valorRecebido / 100).toFixed(2).replace(".", ",") : "",
      l.confirmadoEm ? formatDate(l.confirmadoEm, true) : "",
    ].map(csv).join(";")
  );

  // BOM UTF-8 para o Excel abrir acentos corretamente; separador ";" (padrão pt-BR).
  const body = "﻿" + [headers.join(";"), ...rows].join("\r\n");
  const filename = `leads-${period.key}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
