import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Period } from "@/server/admin/period";

export type Filters = { period: Period; campaign?: string | null };

/** Divisão protegida contra zero; retorna fração 0–1. */
export const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

export type Metrics = Awaited<ReturnType<typeof getMetrics>>;

export async function getMetrics({ period, campaign }: Filters) {
  const range = { gte: period.from, lt: period.to };
  const eventWhere: Prisma.QuizEventWhereInput = { createdAt: range, ...(campaign ? { utmCampaign: campaign } : {}) };
  const leadWhere: Prisma.LeadWhereInput = { createdAt: range, ...(campaign ? { utmCampaign: campaign } : {}) };

  const [eventsByType, leadsByStatus, totalLeads, revenueAgg, spendAgg] = await Promise.all([
    // Cada evento é único por sessão (dedup no banco), então a contagem já é por sessão única.
    db.quizEvent.groupBy({ by: ["type"], where: eventWhere, _count: { _all: true } }),
    db.lead.groupBy({ by: ["status"], where: leadWhere, _count: { _all: true } }),
    db.lead.count({ where: leadWhere }),
    db.lead.aggregate({
      where: { status: "ATIVADO", confirmadoEm: range, ...(campaign ? { utmCampaign: campaign } : {}) },
      _sum: { valorRecebido: true },
    }),
    db.adSpend.aggregate({ where: { data: range, ...(campaign ? { campanha: campaign } : {}) }, _sum: { valorCents: true } }),
  ]);

  const ev = (t: string) => eventsByType.find((e) => e.type === t)?._count._all ?? 0;
  const st = (s: string) => leadsByStatus.find((l) => l.status === s)?._count._all ?? 0;

  const started = ev("quiz_started");
  const feeReached = ev("fee_step_reached");
  const leadSubmitted = ev("lead_submitted");
  const whatsappClicked = ev("whatsapp_clicked");

  const conversas = st("CONVERSA_INICIADA") + st("EM_ATENDIMENTO") + st("ATIVADO");
  const ativados = st("ATIVADO");
  const naoConvertidos = st("NAO_CONVERTIDO");
  const revenueCents = revenueAgg._sum.valorRecebido ?? 0;
  const spendCents = spendAgg._sum.valorCents ?? 0;

  return {
    funnel: { started, feeReached, leadSubmitted, whatsappClicked },
    leads: { total: totalLeads, conversas, ativados, naoConvertidos },
    revenueCents,
    spendCents,
    rates: {
      // denominador = sessões que iniciaram o quiz
      chegadaTaxa: ratio(feeReached, started),
      captura: ratio(leadSubmitted, started),
      // denominador = leads enviados
      cliqueWhatsapp: ratio(whatsappClicked, leadSubmitted),
      conversa: ratio(conversas, totalLeads),
      ativacao: ratio(ativados, totalLeads),
    },
    // custo por lead / ativação — só fazem sentido com gasto informado
    cplCents: totalLeads > 0 ? Math.round(spendCents / totalLeads) : null,
    cpaCents: ativados > 0 ? Math.round(spendCents / ativados) : null,
  };
}

/** Lista as campanhas (utm_campaign) presentes nos leads, para o filtro. */
export async function listCampaigns(): Promise<string[]> {
  const rows = await db.lead.findMany({
    where: { utmCampaign: { not: null } },
    distinct: ["utmCampaign"],
    select: { utmCampaign: true },
    take: 100,
  });
  return rows.map((r) => r.utmCampaign!).filter(Boolean).sort();
}
