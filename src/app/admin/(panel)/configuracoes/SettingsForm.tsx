"use client";

import { useActionState, useState } from "react";
import { MessageCircle, QrCode, Save } from "lucide-react";
import { updateSettings } from "./actions";
import type { ActionResult } from "@/server/admin/guard";
import type { AppSettings } from "@/server/settings";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateSettings, undefined);
  const [cta, setCta] = useState<AppSettings["ctaMode"]>(settings.ctaMode);
  const priceReais = (settings.priceCents / 100).toFixed(2).replace(".", ",");

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Modo do CTA final */}
      <div>
        <h2 className="text-sm font-bold text-ink-900">Botão final do quiz</h2>
        <p className="mt-1 text-xs text-ink-500">Escolha para onde o lead vai após preencher os dados. Útil para testar tráfego direto para o checkout.</p>
        <input type="hidden" name="ctaMode" value={cta} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModeCard active={cta === "whatsapp"} onClick={() => setCta("whatsapp")} icon={<MessageCircle className="h-5 w-5" aria-hidden />} title="WhatsApp" desc="O lead é enviado ao WhatsApp para falar com a equipe." />
          <ModeCard active={cta === "checkout"} onClick={() => setCta("checkout")} icon={<QrCode className="h-5 w-5" aria-hidden />} title="Checkout (Pix)" desc="O lead vai direto para o pagamento da ativação." />
        </div>
        <div className="mt-3">
          <Field label="WhatsApp comercial (DDD + número)" name="whatsappPhone" defaultValue={settings.whatsappPhone} placeholder="11999999999" />
          <p className="mt-1 text-xs text-ink-500">Usado quando o botão final é WhatsApp. Pode deixar em branco até cadastrar o número.</p>
        </div>
      </div>

      {/* Produto e preço */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do produto/serviço" name="productName" defaultValue={settings.productName} />
        <Field label="Taxa de ativação (R$)" name="priceReais" defaultValue={priceReais} placeholder="249,90" />
        <div className="sm:col-span-2">
          <Field label="Descrição do produto" name="productDescription" defaultValue={settings.productDescription} textarea />
        </div>
      </div>

      {/* Cobrança */}
      <div>
        <h2 className="text-sm font-bold text-ink-900">Cobrança</h2>
        <p className="mt-1 text-xs text-ink-500">Nome que aparece na fatura do cliente. Altere aqui se trocar de adquirente.</p>
        <div className="mt-3">
          <Field label="Nome na cobrança (descritor)" name="merchantDescriptor" defaultValue={settings.merchantDescriptor} placeholder="BRASIL PAY SERVIÇOS LTDA" />
        </div>
      </div>

      {/* Textos do checkout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Título do checkout" name="checkoutHeadline" defaultValue={settings.checkoutHeadline} />
        <Field label="Subtítulo do checkout" name="checkoutSubheadline" defaultValue={settings.checkoutSubheadline} />
      </div>

      {/* Crediário */}
      <div>
        <h2 className="text-sm font-bold text-ink-900">Crediário (método por protocolo)</h2>
        <p className="mt-1 text-xs text-ink-500">Quando ativo, aparece como forma de pagamento no checkout. Os pedidos ficam pendentes para você confirmar manualmente em Pedidos.</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700">
          <input type="checkbox" name="crediarioEnabled" value="on" defaultChecked={settings.crediarioEnabled} className="h-5 w-5 rounded border-ink-300 accent-brand-600" />
          Habilitar crediário no checkout
        </label>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Máximo de parcelas" name="crediarioMaxInstallments" defaultValue={String(settings.crediarioMaxInstallments)} placeholder="12" />
          <Field label="Rótulo do método (aba)" name="crediarioMethodLabel" defaultValue={settings.crediarioMethodLabel} />
          <Field label="Subtítulo do método ({parcelas} = máx. parcelas)" name="crediarioMethodSubtitle" defaultValue={settings.crediarioMethodSubtitle} />
          <Field label="Título da seção" name="crediarioSectionTitle" defaultValue={settings.crediarioSectionTitle} />
          <div className="sm:col-span-2">
            <Field label="Instruções do crediário (no checkout)" name="crediarioInstructions" defaultValue={settings.crediarioInstructions} textarea />
          </div>
          <Field label="Rótulo do protocolo" name="crediarioProtocolLabel" defaultValue={settings.crediarioProtocolLabel} />
          <Field label="Placeholder do protocolo" name="crediarioProtocolPlaceholder" defaultValue={settings.crediarioProtocolPlaceholder} />
          <Field label="Rótulo da validade" name="crediarioValidityLabel" defaultValue={settings.crediarioValidityLabel} />
          <Field label="Placeholder da validade" name="crediarioValidityPlaceholder" defaultValue={settings.crediarioValidityPlaceholder} />
          <Field label="Rótulo do CPF" name="crediarioCpfLabel" defaultValue={settings.crediarioCpfLabel} />
          <Field label="Placeholder do CPF" name="crediarioCpfPlaceholder" defaultValue={settings.crediarioCpfPlaceholder} />
          <Field label="Rótulo do parcelamento" name="crediarioInstallmentsLabel" defaultValue={settings.crediarioInstallmentsLabel} />
          <Field label="Texto do botão" name="crediarioButtonLabel" defaultValue={settings.crediarioButtonLabel} />
          <Field label="Título da confirmação" name="crediarioSuccessTitle" defaultValue={settings.crediarioSuccessTitle} />
          <div className="sm:col-span-2">
            <Field label="Mensagem de confirmação (crediário)" name="crediarioSuccessMessage" defaultValue={settings.crediarioSuccessMessage} textarea />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          <Save className="h-4 w-4" aria-hidden /> Salvar configurações
        </button>
        {state?.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-sm font-medium text-brand-700">{state.message}</span>}
      </div>
    </form>
  );
}

function ModeCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${active ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white hover:border-brand-300"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"}`}>{icon}</span>
      <span>
        <span className="block text-sm font-bold text-ink-900">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-500">{desc}</span>
      </span>
    </button>
  );
}

function Field({ label, name, defaultValue, placeholder, textarea }: { label: string; name: string; defaultValue?: string; placeholder?: string; textarea?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-600">{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={3} className="rounded-xl border-2 border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400" />
      ) : (
        <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="h-11 rounded-xl border-2 border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400" />
      )}
    </label>
  );
}
