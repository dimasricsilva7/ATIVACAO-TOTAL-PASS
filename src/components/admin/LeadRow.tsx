"use client";

import { useActionState, useState } from "react";
import { MessageCircle, Save } from "lucide-react";
import type { LeadStatus } from "@prisma/client";
import { updateLeadStatus } from "@/app/admin/(panel)/leads/actions";
import type { ActionResult } from "@/server/admin/guard";
import { STATUS_LABEL, StatusBadge } from "./ui";
import { formatBRL, formatDate, formatPhone } from "@/utils/format";

export type LeadView = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  objetivoLabel: string;
  cidade: string | null;
  estado: string | null;
  origem: string;
  status: LeadStatus;
  valorRecebido: number | null;
  createdAt: string;
  waUrl: string | null;
};

const ORDER: LeadStatus[] = ["NOVO", "CONVERSA_INICIADA", "EM_ATENDIMENTO", "ATIVADO", "NAO_CONVERTIDO"];

export function LeadRow({ lead }: { lead: LeadView }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateLeadStatus, undefined);

  return (
    <>
      <tr className="border-t border-ink-100 align-top">
        <td className="px-3 py-3">
          <p className="font-semibold text-ink-900">{lead.nome}</p>
          <p className="text-xs text-ink-500">{lead.email}</p>
        </td>
        <td className="px-3 py-3 text-ink-700">{formatPhone(lead.telefone)}</td>
        <td className="hidden px-3 py-3 text-ink-600 md:table-cell">{lead.objetivoLabel}</td>
        <td className="hidden px-3 py-3 text-ink-600 lg:table-cell">{[lead.cidade, lead.estado].filter(Boolean).join("/") || "—"}</td>
        <td className="hidden px-3 py-3 text-ink-500 lg:table-cell">{lead.origem}</td>
        <td className="hidden px-3 py-3 text-ink-500 sm:table-cell">{formatDate(lead.createdAt, true)}</td>
        <td className="px-3 py-3">
          <StatusBadge status={lead.status} />
          {lead.valorRecebido != null && <p className="mt-1 text-xs font-semibold text-brand-700">{formatBRL(lead.valorRecebido)}</p>}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            {lead.waUrl && (
              <a href={lead.waUrl} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white" title="Abrir WhatsApp">
                <MessageCircle className="h-4 w-4" aria-hidden />
              </a>
            )}
            <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">
              {open ? "Fechar" : "Status"}
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-ink-100 bg-ink-50">
          <td colSpan={8} className="px-3 py-3">
            <form action={action} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={lead.id} />
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-600">
                Status comercial
                <select name="status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="h-10 rounded-lg border-2 border-ink-200 bg-white px-2 text-sm">
                  {ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </label>
              {status === "ATIVADO" && (
                <>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-600">
                    Valor recebido (R$)
                    <input name="valor" inputMode="decimal" placeholder="249,90" defaultValue={lead.valorRecebido != null ? (lead.valorRecebido / 100).toFixed(2).replace(".", ",") : ""} className="h-10 w-32 rounded-lg border-2 border-ink-200 bg-white px-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-600">
                    Data da confirmação
                    <input name="data" type="date" className="h-10 rounded-lg border-2 border-ink-200 bg-white px-2 text-sm" />
                  </label>
                </>
              )}
              <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white disabled:opacity-60">
                <Save className="h-4 w-4" aria-hidden /> Salvar
              </button>
              {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
              {state?.ok && <span className="text-xs font-medium text-brand-700">{state.message}</span>}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
