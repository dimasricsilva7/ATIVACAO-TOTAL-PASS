import Link from "next/link";
import { Download } from "lucide-react";
import type { LeadStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getMetrics, listCampaigns } from "@/server/metrics";
import { resolvePeriod } from "@/server/admin/period";
import { buildWhatsappLink } from "@/server/whatsapp";
import { envHealth } from "@/lib/env";
import { labelFor } from "@/lib/quiz";
import { formatBRL } from "@/utils/format";
import { Card, StatCard, STATUS_LABEL } from "@/components/admin/ui";
import { LeadRow, type LeadView } from "@/components/admin/LeadRow";
import { AdSpendForm } from "@/components/admin/AdSpendForm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES: LeadStatus[] = ["NOVO", "CONVERSA_INICIADA", "EM_ATENDIMENTO", "ATIVADO", "NAO_CONVERTIDO"];
const pct = (frac: number) => `${(frac * 100).toFixed(1)}%`;

const PERIODS = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Este mês" },
];

type SP = Record<string, string | string[] | undefined>;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const campaign = typeof sp.campanha === "string" && sp.campanha ? sp.campanha : null;
  const statusFilter = typeof sp.status === "string" && STATUSES.includes(sp.status as LeadStatus) ? (sp.status as LeadStatus) : null;
  const page = Math.max(1, Number(sp.page) || 1);

  const leadWhere: Prisma.LeadWhereInput = {
    createdAt: { gte: period.from, lt: period.to },
    ...(campaign ? { utmCampaign: campaign } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  let metrics, campaigns, leads, totalLeads, dbError = false;
  try {
    [metrics, campaigns, leads, totalLeads] = await Promise.all([
      getMetrics({ period, campaign }),
      listCampaigns(),
      db.lead.findMany({ where: leadWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      db.lead.count({ where: leadWhere }),
    ]);
  } catch {
    dbError = true;
  }

  if (dbError || !metrics) {
    const missing = envHealth().filter((e) => e.required && !e.ok);
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-900">Banco de dados indisponível</h1>
        <p className="mt-2 text-sm text-amber-800">
          Não foi possível ler os dados. Verifique a conexão com o Postgres e se as migrations foram aplicadas.
        </p>
        {missing.length > 0 && (
          <ul className="mt-3 list-inside list-disc text-sm text-amber-800">
            {missing.map((m) => (<li key={m.key}><code>{m.key}</code> — {m.hint}</li>))}
          </ul>
        )}
      </div>
    );
  }

  const leadViews: LeadView[] = leads!.map((l) => ({
    id: l.id,
    nome: l.nome,
    telefone: l.telefone,
    email: l.email,
    objetivoLabel: labelFor("objetivo", l.objetivo),
    cidade: l.cidade,
    estado: l.estado,
    origem: [l.utmSource, l.utmCampaign].filter(Boolean).join(" · ") || l.origem || "direto",
    status: l.status,
    valorRecebido: l.valorRecebido,
    createdAt: l.createdAt.toISOString(),
    waUrl: buildWhatsappLink(l),
  }));

  const totalPages = Math.max(1, Math.ceil(totalLeads! / PAGE_SIZE));
  const qs = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams();
    if (period.key !== "7d") next.set("periodo", period.key);
    if (period.key === "custom") { next.set("de", period.fromInput); next.set("ate", period.toInput); }
    if (campaign) next.set("campanha", campaign);
    if (statusFilter) next.set("status", statusFilter);
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === "") next.delete(k); else next.set(k, String(v)); }
    const s = next.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  const { funnel, leads: L, rates, revenueCents, cplCents, cpaCents } = metrics;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros de período */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link key={p.key} href={qs({ periodo: p.key === "7d" ? null : p.key, de: null, ate: null, page: null })}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${period.key === p.key ? "bg-brand-600 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
            {p.label}
          </Link>
        ))}
        <form className="flex items-center gap-1.5" action="/admin">
          <input type="hidden" name="periodo" value="custom" />
          <input type="date" name="de" defaultValue={period.fromInput} className="h-9 rounded-lg border border-ink-200 px-2 text-sm" />
          <span className="text-ink-400">–</span>
          <input type="date" name="ate" defaultValue={period.toInput} className="h-9 rounded-lg border border-ink-200 px-2 text-sm" />
          {campaign && <input type="hidden" name="campanha" value={campaign} />}
          <button type="submit" className="h-9 rounded-lg bg-ink-800 px-3 text-sm font-semibold text-white">Aplicar</button>
        </form>
        <span className="ml-auto text-xs text-ink-500">Período: <strong>{period.label}</strong> · fuso de Brasília</span>
      </div>

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Inícios do quiz" value={String(funnel.started)} hint="sessões únicas" />
        <StatCard label="Chegaram à taxa" value={String(funnel.feeReached)} hint="sessões únicas" />
        <StatCard label="Leads enviados" value={String(L.total)} hint="dados completos" />
        <StatCard label="Cliques no WhatsApp" value={String(funnel.whatsappClicked)} hint="sessões únicas" />
        <StatCard label="Conversas iniciadas" value={String(L.conversas)} hint="confirmação manual" />
        <StatCard label="Ativações concluídas" value={String(L.ativados)} hint="confirmação manual" />
        <StatCard label="Receita confirmada" value={formatBRL(revenueCents)} hint="valores recebidos" accent />
        <StatCard label="Lead → ativação" value={pct(rates.ativacao)} hint="ativações / leads" accent />
      </div>

      {/* Métricas calculadas com denominador explícito */}
      <Card title="Taxas de conversão (denominador explícito)">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Rate label="Chegada à taxa" value={pct(rates.chegadaTaxa)} den={`${funnel.feeReached} de ${funnel.started} sessões iniciadas`} />
          <Rate label="Captura de leads" value={pct(rates.captura)} den={`${L.total} leads de ${funnel.started} sessões iniciadas`} />
          <Rate label="Clique no WhatsApp" value={pct(rates.cliqueWhatsapp)} den={`${funnel.whatsappClicked} de ${L.total} leads`} />
          <Rate label="Conversa" value={pct(rates.conversa)} den={`${L.conversas} de ${L.total} leads`} />
          <Rate label="Ativação" value={pct(rates.ativacao)} den={`${L.ativados} de ${L.total} leads`} />
          <Rate label="Custo por lead / ativação" value={`${cplCents != null ? formatBRL(cplCents) : "—"} / ${cpaCents != null ? formatBRL(cpaCents) : "—"}`} den="depende do gasto informado" />
        </div>
        <p className="mt-3 text-xs text-ink-400">Cliques no WhatsApp ≠ conversas: a conversa e a ativação são confirmadas manualmente na tabela abaixo.</p>
      </Card>

      {/* Gasto de anúncios */}
      <Card title="Gasto de anúncios (para custo por lead e por ativação)">
        <AdSpendForm />
        <p className="mt-2 text-xs text-ink-400">Gasto total no período: <strong>{formatBRL(metrics.spendCents)}</strong>.</p>
      </Card>

      {/* Tabela de leads */}
      <Card
        title={`Leads (${totalLeads})`}
        action={
          <Link href={`/api/admin/leads/export${qs({ page: null }).replace("/admin", "")}`} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
            <Download className="h-4 w-4" aria-hidden /> Exportar CSV
          </Link>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href={qs({ status: null, page: null })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${!statusFilter ? "bg-ink-800 text-white" : "bg-ink-100 text-ink-600"}`}>Todos</Link>
          {STATUSES.map((s) => (
            <Link key={s} href={qs({ status: s, page: null })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusFilter === s ? "bg-ink-800 text-white" : "bg-ink-100 text-ink-600"}`}>{STATUS_LABEL[s]}</Link>
          ))}
        </div>

        {campaigns!.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-500">Campanha:</span>
            <Link href={qs({ campanha: null, page: null })} className={`rounded-full px-2.5 py-1 font-semibold ${!campaign ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>Todas</Link>
            {campaigns!.map((c) => (
              <Link key={c} href={qs({ campanha: c, page: null })} className={`rounded-full px-2.5 py-1 font-semibold ${campaign === c ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>{c}</Link>
            ))}
          </div>
        )}

        {leadViews.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Nenhum lead neste período/filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-3 py-2 font-semibold">Lead</th>
                  <th className="px-3 py-2 font-semibold">WhatsApp</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Objetivo</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Cidade/UF</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Origem</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Data</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leadViews.map((lead) => (<LeadRow key={lead.id} lead={lead} />))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            {page > 1 && <Link href={qs({ page: page - 1 })} className="rounded-lg border border-ink-200 px-3 py-1.5 font-medium hover:bg-ink-50">← Anterior</Link>}
            <span className="text-ink-500">Página {page} de {totalPages}</span>
            {page < totalPages && <Link href={qs({ page: page + 1 })} className="rounded-lg border border-ink-200 px-3 py-1.5 font-medium hover:bg-ink-50">Próxima →</Link>}
          </div>
        )}
      </Card>
    </div>
  );
}

function Rate({ label, value, den }: { label: string; value: string; den: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-1.5">
      <span className="text-ink-600">{label}</span>
      <span className="text-right"><strong className="text-ink-900">{value}</strong> <span className="text-xs text-ink-400">({den})</span></span>
    </div>
  );
}
