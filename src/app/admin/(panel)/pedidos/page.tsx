import type { OrderStatus } from "@prisma/client";
import { Check, X } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { formatProtocol } from "@/lib/crediario";
import { Card, StatCard } from "@/components/admin/ui";
import { formatBRL, formatDate, formatPhone } from "@/utils/format";
import { confirmOrder, cancelOrder } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<OrderStatus, string> = { PENDING: "Aguardando", PAID: "Pago", EXPIRED: "Expirado", CANCELED: "Cancelado" };
const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-brand-100 text-brand-800",
  EXPIRED: "bg-ink-100 text-ink-600",
  CANCELED: "bg-red-100 text-red-700",
};

export default async function PedidosPage() {
  await requireAdmin();

  let orders, paidAgg, paidCount, totalCount, dbError = false;
  try {
    [orders, paidAgg, paidCount, totalCount] = await Promise.all([
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      db.order.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
      db.order.count({ where: { status: "PAID" } }),
      db.order.count(),
    ]);
  } catch {
    dbError = true;
  }

  if (dbError || !orders) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Não foi possível ler os pedidos. Verifique a conexão com o banco.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pedidos" value={String(totalCount)} />
        <StatCard label="Pagos" value={String(paidCount)} />
        <StatCard label="Receita (pagos)" value={formatBRL(paidAgg?._sum.amountCents ?? 0)} accent />
        <StatCard label="Conversão" value={totalCount ? `${((paidCount! / totalCount!) * 100).toFixed(1)}%` : "—"} hint="pagos / pedidos" />
      </div>

      <Card title={`Pedidos do checkout (${totalCount})`}>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Nenhum pedido ainda. Eles aparecem quando alguém finaliza no checkout.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-3 py-2 font-semibold">Pedido</th>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Método</th>
                  <th className="px-3 py-2 font-semibold">Valor</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Data</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const protocol = o.crediarioProtocol ? decryptField(o.crediarioProtocol) : null;
                  return (
                    <tr key={o.id} className="border-t border-ink-100 align-top">
                      <td className="px-3 py-3 font-mono text-xs text-ink-700">{o.numero}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-ink-900">{o.nome}</p>
                        <p className="text-xs text-ink-500">{formatPhone(o.telefone)} · {o.email}</p>
                        <p className="text-xs text-ink-400">{[o.utmSource, o.utmCampaign].filter(Boolean).join(" · ") || "direto"}</p>
                      </td>
                      <td className="px-3 py-3">
                        {o.method === "CREDIARIO" ? (
                          <div className="text-xs">
                            <span className="font-semibold text-ink-800">Crediário {o.crediarioInstallments}x</span>
                            {protocol && <p className="mt-0.5 font-mono text-ink-600">{formatProtocol(protocol)}</p>}
                            <p className="text-ink-400">val {o.crediarioValidity} · CPF ***{o.crediarioCpfLast}</p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-ink-700">Pix</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink-900">{formatBRL(o.amountCents)}</td>
                      <td className="hidden px-3 py-3 text-ink-500 sm:table-cell">{formatDate(o.createdAt, true)}</td>
                      <td className="px-3 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                      <td className="px-3 py-3">
                        {o.status === "PENDING" ? (
                          <div className="flex gap-1.5">
                            <form action={confirmOrder}>
                              <input type="hidden" name="numero" value={o.numero} />
                              <button type="submit" title="Confirmar pagamento" className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" aria-hidden /> Confirmar</button>
                            </form>
                            <form action={cancelOrder}>
                              <input type="hidden" name="numero" value={o.numero} />
                              <button type="submit" title="Cancelar" className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600"><X className="h-3.5 w-3.5" aria-hidden /></button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">{o.paidAt ? formatDate(o.paidAt) : "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
