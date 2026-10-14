"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, MapPin, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { QUIZ_QUESTIONS } from "@/lib/quiz";
import { trackPixel } from "@/lib/pixel";
import { isValidPhone, maskPhone, onlyDigits, UF_LIST } from "@/utils/validators";

type Answers = {
  objetivo?: string;
  acessoAtual?: string;
  preferenciaTreino?: string;
  respostaTaxa?: string;
  cidade?: string;
  estado?: string;
};
type Contact = { nome: string; telefone: string; email: string; consent: boolean };
type Utm = Record<string, string>;
type CtaMode = "whatsapp" | "checkout";

const SID_KEY = "atp_sid";
const UTM_KEY = "atp_utm";
const ANS_KEY = "atp_answers";
const CONTACT_KEY = "atp_contact";
const STARTED_KEY = "atp_started_at";
const STEP_KEY = "atp_step";

const TOTAL_STEPS = QUIZ_QUESTIONS.length + 1;
const FEE_STEP = QUIZ_QUESTIONS.findIndex((q) => q.id === "respostaTaxa") + 1;
const CAPTURE_STEP = QUIZ_QUESTIONS.length + 1;
const FINAL_STEP = CAPTURE_STEP + 1;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage bloqueado: segue sem persistir */
  }
}

function makeSessionId() {
  const abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  const bytes = new Uint8Array(24);
  (globalThis.crypto ?? ({ getRandomValues: (a: Uint8Array) => a } as Crypto)).getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

function captureUtm(): Utm {
  const sp = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const [k, v] of sp.entries()) {
    if (/^utm_(source|medium|campaign|content|term)$/.test(k) && v) utm[k.replace("utm_", "")] = v.slice(0, 200);
    if (k === "fbclid" && v) utm.fbclid = v.slice(0, 500);
  }
  return utm;
}

export function QuizClient({ feeBRL, ctaMode, whatsappConfigured }: { feeBRL: string; ctaMode: CtaMode; whatsappConfigured: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<Contact>({ nome: "", telefone: "", email: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [hp, setHp] = useState("");

  const sid = useRef<string>("");
  const utm = useRef<Utm>({});
  const firedEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    let s = "";
    try {
      s = localStorage.getItem(SID_KEY) || "";
    } catch {
      /* ignore */
    }
    if (!s) {
      s = makeSessionId();
      writeJSON(STARTED_KEY, Date.now());
      try {
        localStorage.setItem(SID_KEY, s);
      } catch {
        /* ignore */
      }
    }
    sid.current = s;

    const storedUtm = readJSON<Utm>(UTM_KEY, {});
    const fresh = captureUtm();
    utm.current = Object.keys(storedUtm).length ? storedUtm : fresh;
    if (!Object.keys(storedUtm).length && Object.keys(fresh).length) writeJSON(UTM_KEY, fresh);

    setAnswers(readJSON<Answers>(ANS_KEY, {}));
    setContact(readJSON<Contact>(CONTACT_KEY, { nome: "", telefone: "", email: "", consent: false }));
    setStep(Math.min(Math.max(0, readJSON<number>(STEP_KEY, 0)), CAPTURE_STEP));
    setReady(true);
  }, []);

  const persistAnswers = useCallback((next: Answers) => {
    setAnswers(next);
    writeJSON(ANS_KEY, next);
  }, []);

  const goTo = useCallback((next: number) => {
    setStep(next);
    setSubmitError(null);
    writeJSON(STEP_KEY, next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const fireEvent = useCallback((type: string) => {
    if (firedEvents.current.has(type)) return;
    firedEvents.current.add(type);
    const body = JSON.stringify({ sessionId: sid.current, type, utm: utm.current });
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (ready && step === FEE_STEP) fireEvent("fee_step_reached");
  }, [ready, step, fireEvent]);

  const startQuiz = () => {
    fireEvent("quiz_started");
    trackPixel("QuizStarted");
    if (!readJSON<number>(STARTED_KEY, 0)) writeJSON(STARTED_KEY, Date.now());
    goTo(1);
  };

  const selectOption = (questionId: keyof Answers, value: string, autoAdvance: boolean) => {
    const next = { ...answers, [questionId]: value };
    persistAnswers(next);
    if (autoAdvance) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => goTo(step + 1), reduce ? 0 : 260);
    }
  };

  const validateContact = (): boolean => {
    const e: Record<string, string> = {};
    if (contact.nome.trim().split(/\s+/).filter(Boolean).length < 2) e.nome = "Informe seu nome completo.";
    if (!isValidPhone(contact.telefone)) e.telefone = "WhatsApp inválido. Use DDD + número.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim())) e.email = "E-mail inválido.";
    if (!contact.consent) e.consent = "É necessário aceitar o aviso de privacidade.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validateContact()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const startedAt = readJSON<number>(STARTED_KEY, Date.now());
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid.current,
          nome: contact.nome.trim(),
          telefone: onlyDigits(contact.telefone),
          email: contact.email.trim(),
          cidade: answers.cidade?.trim(),
          estado: answers.estado,
          objetivo: answers.objetivo ?? null,
          acessoAtual: answers.acessoAtual ?? null,
          preferenciaTreino: answers.preferenciaTreino ?? null,
          respostaTaxa: answers.respostaTaxa ?? null,
          consent: contact.consent,
          utm: utm.current,
          hp,
          elapsedMs: Math.max(0, Date.now() - startedAt),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; whatsappUrl?: string | null; error?: string };
      if (!res.ok || !data.ok) {
        setSubmitError(data.error || "Não foi possível registrar seus dados. Tente novamente.");
        return;
      }
      trackPixel("Lead");
      setWhatsappUrl(data.whatsappUrl ?? null);
      try {
        [ANS_KEY, CONTACT_KEY, STEP_KEY].forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }

      // Modo checkout: segue direto para o pagamento, levando a sessão para pré-preencher.
      if (ctaMode === "checkout") {
        trackPixel("Contact");
        router.push(`/checkout?sid=${encodeURIComponent(sid.current)}`);
        return;
      }
      setStep(FINAL_STEP);
    } catch {
      setSubmitError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsapp = () => {
    fireEvent("whatsapp_clicked");
    trackPixel("Contact");
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const progress = useMemo(() => {
    if (step === 0) return 0;
    if (step >= FINAL_STEP) return 100;
    return Math.round((Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100);
  }, [step]);

  if (!ready) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-quiz flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <Header progress={progress} showProgress={step > 0 && step < FINAL_STEP} step={step} />

      <div className="flex flex-1 flex-col justify-center py-4">
        {step === 0 && <Intro onStart={startQuiz} feeBRL={feeBRL} ctaMode={ctaMode} />}

        {step >= 1 && step <= QUIZ_QUESTIONS.length && (
          <QuestionStep
            key={step}
            step={step}
            answers={answers}
            feeBRL={feeBRL}
            ctaMode={ctaMode}
            onSelect={selectOption}
            onLocationChange={(cidade, estado) => persistAnswers({ ...answers, cidade, estado })}
            onBack={() => goTo(step - 1)}
            onContinue={() => goTo(step + 1)}
          />
        )}

        {step === CAPTURE_STEP && (
          <CaptureStep
            contact={contact}
            errors={errors}
            submitting={submitting}
            submitError={submitError}
            hp={hp}
            ctaMode={ctaMode}
            onHp={setHp}
            onChange={(c) => {
              setContact(c);
              writeJSON(CONTACT_KEY, c);
            }}
            onBack={() => goTo(step - 1)}
            onSubmit={submit}
          />
        )}

        {step === FINAL_STEP && <FinalStep whatsappUrl={whatsappUrl} whatsappConfigured={whatsappConfigured} onOpen={openWhatsapp} />}
      </div>

      <Footer />
    </div>
  );
}

/* ───────────────────────── Sub-componentes ───────────────────────── */

function Header({ progress, showProgress, step }: { progress: number; showProgress: boolean; step: number }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <Zap className="h-5 w-5" aria-hidden fill="currentColor" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold tracking-tight text-white">Ativação TotalPass</span>
          <span className="text-[11px] font-medium text-brand-200">Inclusão no Programa</span>
        </span>
        {step > 0 && step < FINAL_STEP && (
          <span className="ml-auto text-[11px] font-semibold text-ink-300">{Math.min(step, TOTAL_STEPS)}/{TOTAL_STEPS}</span>
        )}
      </div>
      {showProgress && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso">
          <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}
    </header>
  );
}

function Intro({ onStart, feeBRL, ctaMode }: { onStart: () => void; feeBRL: string; ctaMode: CtaMode }) {
  return (
    <section className="animate-fade-up text-center">
      <span className="mx-auto inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-semibold text-brand-100">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Ative e treine nas melhores academias
      </span>
      <h1 className="mt-5 text-balance text-[2rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl">
        Quer treinar com o <span className="text-gradient">TotalPass</span>?
      </h1>
      <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-ink-200">
        Responda algumas perguntas rápidas e ative sua inclusão no programa para treinar em milhares de academias.
      </p>

      <div className="mx-auto mt-7 flex max-w-sm flex-col gap-2.5 text-left">
        {[
          { icon: BadgeCheck, t: "Ativação com inclusão do seu CPF no programa" },
          { icon: MapPin, t: "Acesso a academias em várias regiões" },
          { icon: ShieldCheck, t: "Acompanhamento humano da nossa equipe" },
        ].map(({ icon: Icon, t }) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl glass px-4 py-3 text-sm font-medium text-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white"><Icon className="h-4 w-4" aria-hidden /></span>
            {t}
          </div>
        ))}
      </div>

      <button type="button" onClick={onStart} className="group mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-extrabold text-white shadow-glow transition active:scale-[0.99]">
        {ctaMode === "checkout" ? "QUERO ATIVAR MEU ACESSO" : "QUERO CONHECER AS OPÇÕES"}
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden />
      </button>
      <p className="mt-3 text-xs text-ink-300">Taxa única de ativação de {feeBRL} · leva cerca de 1 minuto</p>
    </section>
  );
}

function QuestionStep({
  step,
  answers,
  feeBRL,
  onSelect,
  onLocationChange,
  onBack,
  onContinue,
}: {
  step: number;
  answers: Answers;
  feeBRL: string;
  ctaMode: CtaMode;
  onSelect: (q: keyof Answers, value: string, autoAdvance: boolean) => void;
  onLocationChange: (cidade: string, estado: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const q = QUIZ_QUESTIONS[step - 1];
  const selected = answers[q.id];
  const isLocation = q.id === "preferenciaTreino";
  const isFee = q.id === "respostaTaxa";
  const texto = q.texto?.replace("{FEE}", feeBRL);
  const locationValid = isLocation ? Boolean(answers.cidade && answers.cidade.trim().length >= 2 && answers.estado) : true;
  const canContinue = Boolean(selected) && locationValid;

  return (
    <section className="animate-fade-up">
      <BackButton onBack={onBack} />
      <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight text-white">{q.titulo}</h2>
      {texto && <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-200">{texto}</p>}

      {isFee && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 bg-brand-gradient px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Taxa única de ativação</p>
              <p className="text-3xl font-extrabold leading-none">{feeBRL}</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><BadgeCheck className="h-6 w-6" aria-hidden /></span>
          </div>
          <ul className="flex flex-col gap-2.5 px-5 py-4 text-sm text-ink-700">
            <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Inclusão de 1 CPF no programa de benefícios.</li>
            <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Ativação do acesso às academias participantes.</li>
            <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Acompanhamento da nossa equipe em todo o processo.</li>
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {q.options.map((opt, i) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(q.id, opt.value, !isLocation)}
              aria-pressed={active}
              style={{ animationDelay: `${i * 50}ms` }}
              className={`flex min-h-[58px] animate-fade-up items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium transition active:scale-[0.99] ${
                active
                  ? "border-brand-400 bg-white text-ink-900 shadow-card"
                  : "border-white/12 bg-white/[0.06] text-white hover:border-brand-400/60 hover:bg-white/[0.1]"
              }`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${active ? "border-brand-500 bg-brand-gradient text-white" : "border-white/30 text-transparent"}`}>
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex-1">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {isLocation && (
        <div className="mt-5 grid grid-cols-[1fr,auto] gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cidade" className="text-xs font-semibold text-ink-200">Cidade</label>
            <input
              id="cidade"
              type="text"
              autoComplete="address-level2"
              value={answers.cidade ?? ""}
              onChange={(e) => onLocationChange(e.target.value, answers.estado ?? "")}
              placeholder="Sua cidade"
              className="h-12 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-[15px] text-white placeholder:text-ink-400 outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex w-24 flex-col gap-1.5">
            <label htmlFor="estado" className="text-xs font-semibold text-ink-200">UF</label>
            <select
              id="estado"
              value={answers.estado ?? ""}
              onChange={(e) => onLocationChange(answers.cidade ?? "", e.target.value)}
              className="h-12 rounded-xl border border-white/15 bg-night-800 px-2 text-[15px] text-white outline-none focus:border-brand-400"
            >
              <option value="">—</option>
              {UF_LIST.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isLocation && (
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-extrabold text-white shadow-glow transition enabled:active:scale-[0.99] disabled:opacity-40"
        >
          Continuar <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      )}
    </section>
  );
}

function CaptureStep({
  contact,
  errors,
  submitting,
  submitError,
  hp,
  ctaMode,
  onHp,
  onChange,
  onBack,
  onSubmit,
}: {
  contact: Contact;
  errors: Record<string, string>;
  submitting: boolean;
  submitError: string | null;
  hp: string;
  ctaMode: CtaMode;
  onHp: (v: string) => void;
  onChange: (c: Contact) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="animate-fade-up">
      <BackButton onBack={onBack} />
      <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight text-white">
        {ctaMode === "checkout" ? "Falta pouco para ativar!" : "Vamos continuar pelo WhatsApp?"}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-200">
        {ctaMode === "checkout"
          ? "Informe seus dados para seguir com a ativação do seu acesso."
          : "Informe seus dados para que nossa equipe possa dar continuidade ao atendimento."}
      </p>

      <form
        className="mt-5 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <Field label="Nome completo" htmlFor="nome" error={errors.nome}>
          <input id="nome" type="text" autoComplete="name" value={contact.nome} onChange={(e) => onChange({ ...contact, nome: e.target.value })} className="input-light" placeholder="Nome e sobrenome" />
        </Field>
        <Field label="WhatsApp com DDD" htmlFor="telefone" error={errors.telefone}>
          <input id="telefone" type="tel" inputMode="numeric" autoComplete="tel-national" value={contact.telefone} onChange={(e) => onChange({ ...contact, telefone: maskPhone(e.target.value) })} className="input-light" placeholder="(11) 99999-9999" />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input id="email" type="email" inputMode="email" autoComplete="email" value={contact.email} onChange={(e) => onChange({ ...contact, email: e.target.value })} className="input-light" placeholder="voce@email.com" />
        </Field>

        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => onHp(e.target.value)} className="hidden" aria-hidden />

        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input type="checkbox" checked={contact.consent} onChange={(e) => onChange({ ...contact, consent: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-600" />
          <span>
            Autorizo o contato e o tratamento dos meus dados conforme o{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700 underline">aviso de privacidade</Link>.
          </span>
        </label>
        {errors.consent && <p className="-mt-2 text-xs font-medium text-red-600">{errors.consent}</p>}
        {submitError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{submitError}</p>}

        <button type="submit" disabled={submitting} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-extrabold text-white shadow-glow transition enabled:active:scale-[0.99] disabled:opacity-60">
          {submitting ? (
            <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Enviando…</>
          ) : (
            <>{ctaMode === "checkout" ? "Ir para o pagamento" : "Registrar e continuar"} <ArrowRight className="h-5 w-5" aria-hidden /></>
          )}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Seus dados são usados apenas para o atendimento.
        </p>
      </form>
    </section>
  );
}

function FinalStep({ whatsappUrl, whatsappConfigured, onOpen }: { whatsappUrl: string | null; whatsappConfigured: boolean; onOpen: () => void }) {
  return (
    <section className="animate-scale-in text-center">
      <div className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full bg-brand-gradient text-white shadow-glow">
        <Check className="h-10 w-10" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white">Pronto! Seus dados foram registrados.</h2>
      <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-ink-200">
        Agora continue pelo WhatsApp para concluir a ativação e conhecer os próximos passos.
      </p>

      {whatsappUrl ? (
        <button type="button" onClick={onOpen} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-extrabold text-white shadow-glow transition active:scale-[0.99]">
          <MessageCircle className="h-5 w-5" aria-hidden /> CONTINUAR PELO WHATSAPP
        </button>
      ) : (
        <p className="mt-7 rounded-2xl glass px-4 py-3 text-sm font-medium text-brand-100">
          {whatsappConfigured ? "Não foi possível gerar o link do WhatsApp agora. Nossa equipe entrará em contato." : "Recebemos seus dados. Nossa equipe entrará em contato em breve."}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-300">Ao tocar no botão, o WhatsApp abrirá com uma mensagem pronta — você ainda precisa enviá-la.</p>
    </section>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-ink-300 transition hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
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

function Footer() {
  return (
    <footer className="mt-4 text-center text-[11px] leading-relaxed text-ink-400">
      Serviço independente de ativação. A taxa é do nosso serviço de inclusão no programa.{" "}
      <Link href="/privacidade" className="underline hover:text-ink-200">Privacidade</Link>
    </footer>
  );
}
