import type { LeadStatus } from "@prisma/client";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: "Novo lead",
  CONVERSA_INICIADA: "Conversa iniciada",
  EM_ATENDIMENTO: "Em atendimento",
  ATIVADO: "Ativação concluída",
  NAO_CONVERTIDO: "Não convertido",
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  NOVO: "bg-ink-100 text-ink-700",
  CONVERSA_INICIADA: "bg-sky-100 text-sky-800",
  EM_ATENDIMENTO: "bg-amber-100 text-amber-800",
  ATIVADO: "bg-brand-100 text-brand-800",
  NAO_CONVERTIDO: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-brand-200 bg-brand-50" : "border-ink-200 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tracking-tight ${accent ? "text-brand-800" : "text-ink-900"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
