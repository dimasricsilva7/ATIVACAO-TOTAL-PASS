"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Check, Copy, CreditCard, Lock, Loader2, QrCode, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { trackPixel } from "@/lib/pixel";
import { isValidCpf, isValidPhone, maskCpf, maskPhone, onlyDigits } from "@/utils/validators";
import { installmentOptions, maskValidity, validateCrediario, onlyDigits as digits } from "@/lib/crediario";

type Prefill = { nome: string; email: string; telefone: string } | null;
type Utm = Record<string, string>;
type Pix = { numero: string; copyPaste: string; qrDataUrl: string; expiresAt: string | null };
type Method = "PIX" | "CREDIARIO";
type Stage = "form" | "pix" | "crediario" | "paid";
type Cred = { protocol: string; validity: string; cpfLast3: string; installments: number };

type Props = {
  sessionId: string | null;
  prefill: Prefill;
  productName: string;
  productDescription: string;
  priceBRL: string;
  priceCents: number;
  merchantDescriptor: string;
  headline: string;
  subheadline: string;
  pixAvailable: boolean;
  crediarioEnabled: boolean;
  crediarioMaxInstallments: number;
  crediarioInstructions: string;
};

function readUtm(): Utm {
  try {
    const raw = localStorage.getItem("atp_utm");
    if (raw) return JSON.parse(raw) as Utm;
  } catch {
    /* ignore */
  }
  const sp = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const [k, v] of sp.entries()) {
    if (/^utm_(source|medium|campaign|content|term)$/.test(k) && v) utm[k.replace("utm_", "")] = v.slice(0, 200);
    if (k === "fbclid" && v) utm.fbclid = v.slice(0, 500);
  }
  return utm;
}

export function CheckoutClient(props: Props) {
  const defaultMethod: Method = props.pixAvailable ? "PIX" : props.crediarioEnabled ? "CREDIARIO" : "PIX";
  const [method, setMethod] = useState<Method>(defaultMethod);
  const [stage, setStage] = useState<Stage>("form");
  const [nome, setNome] = useState(props.prefill?.nome ?? "");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState(props.prefill?.telefone ? maskPhone(props.prefill.telefone) : "");
  const [email, setEmail] = useState(props.prefill?.email ?? "");
  const [cred, setCred] = useState<Cred>({ protocol: "", validity: "", cpfLast3: "", installments: 1 });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const hp = useRef("");
  const startedAt = useRef(Date.now());
  const utm = useRef<Utm>({});
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const showSelector = props.pixAvailable && props.crediarioEnabled;
  const installments = installmentOptions(props.priceCents, props.crediarioMaxInstallments);

  useEffect(() => {
    utm.current = readUtm();
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);
  useEffect(() => stopPolling, [stopPolling]);

  const confirmPaid = useCallback(() => {
    stopPolling();
    setStage("paid");
    trackPixel("Purchase", { value: props.priceCents / 100, currency: "BRL" });
  }, [props.priceCents, stopPolling]);

  const checkStatus = useCallback(
    async (num: string, manual = false) => {
      if (manual) setChecking(true);
      try {
        const res = await fetch(`/api/orders/status?numero=${encodeURIComponent(num)}`, { headers: { Accept: "application/json" } });
        const data = (await res.json().catch(() => ({}))) as { status?: string };
        if (data.status === "PAID") confirmPaid();
      } catch {
        /* silencioso */
      } finally {
        if (manual) setChecking(false);
      }
    },
    [confirmPaid]
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (nome.trim().split(/\s+/).filter(Boolean).length < 2) e.nome = "Informe seu nome completo.";
    if (!isValidCpf(cpf)) e.cpf = "CPF inválido.";
    if (!isValidPhone(telefone)) e.telefone = "WhatsApp inválido.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = "E-mail inválido.";
    if (!consent) e.consent = "É necessário aceitar o aviso de privacidade.";
    if (method === "CREDIARIO") Object.assign(e, validateCrediario(cred, props.crediarioMaxInstallments));
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: props.sessionId,
          method,
          nome: nome.trim(),
          cpf: onlyDigits(cpf),
          telefone: onlyDigits(telefone),
          email: email.trim(),
          crediario: method === "CREDIARIO" ? cred : null,
          consent,
          utm: utm.current,
          hp: hp.current,
          elapsedMs: Math.max(0, Date.now() - startedAt.current),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        method?: string;
        numero?: string;
        pix?: Omit<Pix, "numero">;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.numero) {
        setError(data.error || "Não foi possível concluir. Tente novamente.");
        return;
      }
      setNumero(data.numero);
      if (data.method === "crediario") {
        setStage("crediario");
        trackPixel("Lead");
        return;
      }
      if (!data.pix) {
        setError("Não foi possível gerar o Pix. Tente novamente.");
        return;
      }
      const pixData: Pix = { numero: data.numero, ...data.pix };
      setPix(pixData);
      setStage("pix");
      trackPixel("InitiateCheckout", { value: props.priceCents / 100, currency: "BRL" });
      pollTimer.current = setInterval(() => checkStatus(pixData.numero), 4000);
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPix = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado */
    }
  };

  const noMethod = !props.pixAvailable && !props.crediarioEnabled;

  return (
    <div className="mx-auto grid min-h-[100svh] w-full max-w-5xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[1.05fr,1fr] md:items-start md:py-10">
      {/* Banner do produto */}
      <section className="order-1 flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"><Zap className="h-5 w-5" aria-hidden fill="currentColor" /></span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-extrabold tracking-tight text-white">Ativação TotalPass</span>
            <span className="text-[11px] font-medium text-brand-200">Inclusão no Programa</span>
          </span>
        </div>

        <div className="rounded-3xl glass p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 text-xs font-bold text-white"><Sparkles className="h-3.5 w-3.5" aria-hidden /> Ativação do seu acesso</span>
          <h1 className="mt-4 text-balance text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">{props.headline}</h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-200">{props.subheadline}</p>

          <div className="mt-5 flex flex-col gap-2.5">
            {["Inclusão de 1 CPF no programa de benefícios", "Acesso a academias em várias regiões", "Acompanhamento humano da nossa equipe"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-sm font-medium text-white">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10"><Check className="h-3.5 w-3.5 text-brand-300" aria-hidden /></span>
                {t}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-end justify-between rounded-2xl bg-white/5 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Taxa única de ativação</p>
              <p className="text-3xl font-extrabold text-white">{props.priceBRL}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">pagamento único</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-300">
          <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" aria-hidden /> Ambiente seguro</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" aria-hidden /> Dados protegidos (LGPD)</span>
          <span className="inline-flex items-center gap-1.5"><QrCode className="h-4 w-4" aria-hidden /> Pix instantâneo</span>
        </div>
      </section>

      {/* Painel de pagamento */}
      <section className="order-2">
        {stage === "form" && (
          <div className="animate-fade-up rounded-3xl bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-extrabold tracking-tight text-ink-900">Seus dados para a ativação</h2>
            <p className="mt-1 text-sm text-ink-500">Rápido e seguro.</p>

            {noMethod && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Pagamento online indisponível no momento. Fale com o nosso atendimento.</p>
            )}

            {showSelector && (
              <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de pagamento">
                <MethodTab active={method === "PIX"} onClick={() => setMethod("PIX")} icon={<QrCode className="h-5 w-5" aria-hidden />} title="Pix" desc="Na hora" />
                <MethodTab active={method === "CREDIARIO"} onClick={() => setMethod("CREDIARIO")} icon={<CreditCard className="h-5 w-5" aria-hidden />} title="Crediário" desc={`Até ${props.crediarioMaxInstallments}x`} />
              </div>
            )}

            <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
              <Field label="Nome completo" htmlFor="c-nome" error={errors.nome}>
                <input id="c-nome" className="input-light" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" />
              </Field>
              <Field label="CPF (do titular da ativação)" htmlFor="c-cpf" error={errors.cpf}>
                <input id="c-cpf" className="input-light" inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="WhatsApp com DDD" htmlFor="c-tel" error={errors.telefone}>
                  <input id="c-tel" className="input-light" type="tel" inputMode="numeric" autoComplete="tel-national" value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
                </Field>
                <Field label="E-mail" htmlFor="c-email" error={errors.email}>
                  <input id="c-email" className="input-light" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
                </Field>
              </div>

              {method === "CREDIARIO" && (
                <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
                  <p className="text-sm font-bold text-ink-800">Dados do crediário</p>
                  {props.crediarioInstructions && <p className="mt-1 text-xs text-ink-500">{props.crediarioInstructions}</p>}
                  <div className="mt-3 flex flex-col gap-3">
                    <Field label="Número do protocolo (16 dígitos)" htmlFor="cr-prot" error={errors.protocol}>
                      <input id="cr-prot" className="input-light tracking-wider" inputMode="numeric" autoComplete="off" value={cred.protocol} onChange={(e) => setCred({ ...cred, protocol: digits(e.target.value).slice(0, 16) })} placeholder="0000 0000 0000 0000" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Validade (MM/AA)" htmlFor="cr-val" error={errors.validity}>
                        <input id="cr-val" className="input-light" inputMode="numeric" autoComplete="off" maxLength={5} value={cred.validity} onChange={(e) => setCred({ ...cred, validity: maskValidity(e.target.value) })} placeholder="MM/AA" />
                      </Field>
                      <Field label="3 últimos do CPF" htmlFor="cr-cpf" error={errors.cpfLast3}>
                        <input id="cr-cpf" className="input-light" inputMode="numeric" autoComplete="off" value={cred.cpfLast3} onChange={(e) => setCred({ ...cred, cpfLast3: digits(e.target.value).slice(0, 3) })} placeholder="000" />
                      </Field>
                    </div>
                    <fieldset>
                      <legend className="text-sm font-semibold text-ink-700">Parcelamento</legend>
                      <div className="mt-1.5 grid gap-2">
                        {installments.map((o) => (
                          <label key={o.n} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-sm font-semibold ${cred.installments === o.n ? "border-brand-500 bg-brand-50 text-ink-900" : "border-ink-200 bg-white text-ink-700"}`}>
                            <input type="radio" name="cr-inst" checked={cred.installments === o.n} onChange={() => setCred({ ...cred, installments: o.n })} className="h-5 w-5 accent-brand-600" />
                            {o.label}
                          </label>
                        ))}
                      </div>
                      {errors.installments && <p className="mt-1 text-xs font-medium text-red-600">{errors.installments}</p>}
                    </fieldset>
                  </div>
                </div>
              )}

              <input type="text" tabIndex={-1} autoComplete="off" onChange={(e) => (hp.current = e.target.value)} className="hidden" aria-hidden />

              <label className="flex items-start gap-2 text-sm text-ink-600">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-600" />
                <span>Li e aceito o <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700 underline">aviso de privacidade</Link>.</span>
              </label>
              {errors.consent && <p className="-mt-2 text-xs font-medium text-red-600">{errors.consent}</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

              <button type="submit" disabled={submitting || noMethod} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-extrabold text-white shadow-glow transition enabled:active:scale-[0.99] disabled:opacity-60">
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Processando…</>
                ) : method === "CREDIARIO" ? (
                  <><CreditCard className="h-5 w-5" aria-hidden /> Enviar pedido no crediário</>
                ) : (
                  <><QrCode className="h-5 w-5" aria-hidden /> Gerar Pix de {props.priceBRL}</>
                )}
              </button>

              <p className="text-center text-xs text-ink-400">A cobrança aparece como <strong className="text-ink-600">{props.merchantDescriptor}</strong> na sua fatura.</p>
            </form>
          </div>
        )}

        {stage === "pix" && pix && (
          <div className="animate-fade-up rounded-3xl bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2 text-brand-700">
              <QrCode className="h-5 w-5" aria-hidden />
              <h2 className="text-lg font-extrabold tracking-tight text-ink-900">Pague {props.priceBRL} com Pix</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">Escaneie o QR Code ou copie o código. A confirmação é automática.</p>

            {pix.qrDataUrl ? (
              <div className="mx-auto mt-5 w-fit rounded-2xl border border-ink-200 p-3">
                <Image src={pix.qrDataUrl} alt="QR Code do Pix" width={220} height={220} unoptimized className="h-[220px] w-[220px]" />
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-ink-50 px-3 py-2 text-center text-sm text-ink-500">Use o código Pix copia e cola abaixo.</p>
            )}

            <div className="mt-5">
              <p className="text-xs font-semibold text-ink-600">Pix copia e cola</p>
              <div className="mt-1.5 flex items-stretch gap-2">
                <code className="flex-1 truncate rounded-xl border border-ink-200 bg-ink-50 px-3 py-3 text-xs text-ink-700">{pix.copyPaste}</code>
                <button type="button" onClick={copyPix} className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-3 text-sm font-semibold text-white">
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-3 text-sm font-medium text-brand-800">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Aguardando o pagamento…
            </div>
            <button type="button" onClick={() => pix && checkStatus(pix.numero, true)} disabled={checking} className="mt-3 w-full rounded-2xl border-2 border-ink-200 px-6 py-3 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60">
              {checking ? "Verificando…" : "Já paguei, verificar agora"}
            </button>
            <div className="mt-4 space-y-1 text-center text-xs text-ink-400">
              <p>Pedido <strong className="text-ink-600">{pix.numero}</strong> · cobrança: {props.merchantDescriptor}</p>
            </div>
          </div>
        )}

        {stage === "crediario" && (
          <div className="animate-scale-in rounded-3xl bg-white p-6 text-center shadow-card">
            <div className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full bg-brand-gradient text-white shadow-glow"><CreditCard className="h-9 w-9" aria-hidden /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink-900">Pedido enviado!</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
              Recebemos seu pedido no crediário. Nossa equipe vai analisar e confirmar a ativação do seu acesso, e entrar em contato pelo WhatsApp.
            </p>
            {numero && <p className="mt-4 text-xs text-ink-400">Pedido {numero}</p>}
          </div>
        )}

        {stage === "paid" && (
          <div className="animate-scale-in rounded-3xl bg-white p-6 text-center shadow-card">
            <div className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full bg-brand-gradient text-white shadow-glow"><BadgeCheck className="h-10 w-10" aria-hidden /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink-900">Pagamento confirmado!</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600">Recebemos o seu pagamento. Nossa equipe vai iniciar a ativação da sua inclusão no TotalPass e entrar em contato pelo WhatsApp.</p>
            {numero && <p className="mt-4 text-xs text-ink-400">Pedido {numero}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function MethodTab({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${active ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white hover:border-brand-300"}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"}`}>{icon}</span>
      <span>
        <span className="block text-sm font-bold text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{desc}</span>
      </span>
    </button>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-700">{label}</label>
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
