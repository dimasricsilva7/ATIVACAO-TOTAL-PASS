"use client";

import { useActionState } from "react";
import { addAdSpend } from "@/app/admin/(panel)/leads/actions";
import type { ActionResult } from "@/server/admin/guard";

export function AdSpendForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(addAdSpend, undefined);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-600">
        Data
        <input name="data" type="date" defaultValue={today} className="h-10 rounded-lg border-2 border-ink-200 bg-white px-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-600">
        Campanha (opcional)
        <input name="campanha" placeholder="ex.: insta-leads-out" className="h-10 w-40 rounded-lg border-2 border-ink-200 bg-white px-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-600">
        Valor gasto (R$)
        <input name="valor" inputMode="decimal" placeholder="100,00" className="h-10 w-28 rounded-lg border-2 border-ink-200 bg-white px-2 text-sm" />
      </label>
      <button type="submit" disabled={pending} className="h-10 rounded-lg bg-ink-800 px-3 text-sm font-semibold text-white disabled:opacity-60">Registrar gasto</button>
      {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      {state?.ok && <span className="text-xs font-medium text-brand-700">{state.message}</span>}
    </form>
  );
}
