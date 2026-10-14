"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
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

const SID_KEY = "atp_sid";
const UTM_KEY = "atp_utm";
const ANS_KEY = "atp_answers";
const CONTACT_KEY = "atp_contact";
const STARTED_KEY = "atp_started_at";
const STEP_KEY = "atp_step";

// Passos reais (barra de progresso): 4 perguntas + captura = 5.
const TOTAL_STEPS = QUIZ_QUESTIONS.length + 1;
const FEE_STEP = QUIZ_QUESTIONS.findIndex((q) => q.id === "respostaTaxa") + 1; // índice de passo (1-based)
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
    /* modo privado / storage bloqueado: segue sem persistir */
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

export function QuizClient({ feeBRL, whatsappConfigured }: { feeBRL: string; whatsappConfigured: boolean }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<Contact>({ nome: "", telefone: "", email: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [hp, setHp] = useState(""); // honeypot

  const sid = useRef<string>("");
  const utm = useRef<Utm>({});
  const firedEvents = useRef<Set<string>>(new Set());

  // Carrega estado persistido (preserva respostas ao voltar/atualizar).
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
    utm.current = Object.keys(storedUtm).length ? storedUtm : fresh; // first-touch
    if (!Object.keys(storedUtm).length && Object.keys(fresh).length) writeJSON(UTM_KEY, fresh);

    setAnswers(readJSON<Answers>(ANS_KEY, {}));
    setContact(readJSON<Contact>(CONTACT_KEY, { nome: "", telefone: "", email: "", consent: false }));
    const savedStep = readJSON<number>(STEP_KEY, 0);
    setStep(Math.min(Math.max(0, savedStep), CAPTURE_STEP)); // nunca retoma na tela final
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
    // keepalive garante o envio mesmo em navegação; o servidor deduplica por sessão.
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, []);

  // Dispara fee_step_reached ao chegar na pergunta da taxa.
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
      window.setTimeout(() => goTo(step + 1), reduce ? 0 : 240);
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
      // Limpa o rascunho persistido ao concluir.
      try {
        [ANS_KEY, CONTACT_KEY, STEP_KEY].forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
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
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-quiz flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <Header progress={progress} showProgress={step > 0 && step < FINAL_STEP} />

      <div className="flex flex-1 flex-col justify-center py-4">
        {step === 0 && <Intro onStart={startQuiz} />}

        {step >= 1 && step <= QUIZ_QUESTIONS.length && (
          <QuestionStep
            key={step}
            step={step}
            answers={answers}
            feeBRL={feeBRL}
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
    </div>
  );
}

/* ───────────────────────── Sub-componentes ───────────────────────── */

function Header({ progress, showProgress }: { progress: number; showProgress: boolean }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-brand-700">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Dumbbell className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold tracking-tight text-ink-700">Intermediação para treinar com TotalPass</span>
      </div>
      {showProgress && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do quiz">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}
    </header>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="animate-fade-up text-center">
      <h1 className="text-balance text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
        Quer conhecer as opções para treinar com TotalPass?
      </h1>
      <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-ink-500">
        Responda algumas perguntas rápidas e conheça as condições e os próximos passos para solicitar atendimento.
      </p>
      <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-left text-sm text-ink-600">
        {["Leva cerca de 1 minuto", "Sem compromisso ao responder", "Atendimento humano pelo WhatsApp"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {t}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onStart} className="mt-8 w-full rounded-2xl bg-brand-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.99]">
        QUERO CONHECER AS OPÇÕES
      </button>
      <p className="mt-3 text-xs text-ink-400">Não garantimos aprovação ou acesso. As condições são explicadas no atendimento.</p>
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
  onSelect: (q: keyof Answers, value: string, autoAdvance: boolean) => void;
  onLocationChange: (cidade: string, estado: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const q = QUIZ_QUESTIONS[step - 1];
  const selected = answers[q.id];
  const isLocation = q.id === "preferenciaTreino";
  const texto = q.texto?.replace("{FEE}", feeBRL);
  const locationValid = isLocation ? Boolean(answers.cidade && answers.cidade.trim().length >= 2 && answers.estado) : true;
  const canContinue = Boolean(selected) && locationValid;

  return (
    <section className="animate-fade-up">
      <BackButton onBack={onBack} />
      <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-ink-900">{q.titulo}</h2>
      {texto && <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-600">{texto}</p>}

      {q.id === "respostaTaxa" && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-brand-800">O que está incluído e as condições</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Orientação sobre como solicitar o atendimento.</li>
            <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Acompanhamento do processo pela nossa equipe.</li>
            <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> A taxa de <strong>{feeBRL}</strong> é do serviço de intermediação — não é taxa oficial da TotalPass.</li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">As regras de elegibilidade e as condições são confirmadas no atendimento.</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {q.options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(q.id, opt.value, !isLocation)}
              aria-pressed={active}
              className={`flex min-h-[56px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-medium transition active:scale-[0.99] ${
                active ? "border-brand-500 bg-brand-50 text-ink-900 shadow-sm" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300"
              }`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300 text-transparent"}`}>
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex-1">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {isLocation && (
        <div className="mt-5 grid grid-cols-[1fr,auto] gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="cidade" className="text-xs font-semibold text-ink-600">Cidade</label>
            <input
              id="cidade"
              type="text"
              autoComplete="address-level2"
              value={answers.cidade ?? ""}
              onChange={(e) => onLocationChange(e.target.value, answers.estado ?? "")}
              placeholder="Sua cidade"
              className="h-12 rounded-xl border-2 border-ink-200 bg-white px-3 text-[15px] outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex w-24 flex-col gap-1">
            <label htmlFor="estado" className="text-xs font-semibold text-ink-600">UF</label>
            <select
              id="estado"
              value={answers.estado ?? ""}
              onChange={(e) => onLocationChange(answers.cidade ?? "", e.target.value)}
              className="h-12 rounded-xl border-2 border-ink-200 bg-white px-2 text-[15px] outline-none focus:border-brand-400"
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
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/20 transition enabled:hover:bg-brand-700 enabled:active:scale-[0.99] disabled:opacity-40"
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
  onHp: (v: string) => void;
  onChange: (c: Contact) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="animate-fade-up">
      <BackButton onBack={onBack} />
      <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-ink-900">Vamos continuar pelo WhatsApp?</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">Informe seus dados para que nossa equipe possa dar continuidade ao atendimento.</p>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <Field label="Nome completo" htmlFor="nome" error={errors.nome}>
          <input
            id="nome"
            type="text"
            autoComplete="name"
            value={contact.nome}
            onChange={(e) => onChange({ ...contact, nome: e.target.value })}
            className="h-12 w-full rounded-xl border-2 border-ink-200 bg-white px-3 text-[15px] outline-none focus:border-brand-400"
            placeholder="Nome e sobrenome"
          />
        </Field>

        <Field label="WhatsApp com DDD" htmlFor="telefone" error={errors.telefone}>
          <input
            id="telefone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={contact.telefone}
            onChange={(e) => onChange({ ...contact, telefone: maskPhone(e.target.value) })}
            className="h-12 w-full rounded-xl border-2 border-ink-200 bg-white px-3 text-[15px] outline-none focus:border-brand-400"
            placeholder="(11) 99999-9999"
          />
        </Field>

        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={contact.email}
            onChange={(e) => onChange({ ...contact, email: e.target.value })}
            className="h-12 w-full rounded-xl border-2 border-ink-200 bg-white px-3 text-[15px] outline-none focus:border-brand-400"
            placeholder="voce@email.com"
          />
        </Field>

        {/* honeypot — invisível para pessoas */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => onHp(e.target.value)} className="hidden" aria-hidden />

        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            checked={contact.consent}
            onChange={(e) => onChange({ ...contact, consent: e.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-600"
          />
          <span>
            Autorizo o contato e o tratamento dos meus dados conforme o{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700 underline">aviso de privacidade</Link>.
          </span>
        </label>
        {errors.consent && <p className="-mt-2 text-xs font-medium text-red-600">{errors.consent}</p>}

        {submitError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/20 transition enabled:hover:bg-brand-700 enabled:active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Registrando…</> : <>Registrar e continuar <ArrowRight className="h-5 w-5" aria-hidden /></>}
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
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700">
        <Check className="h-9 w-9" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink-900">Pronto! Seus dados foram registrados.</h2>
      <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-ink-600">
        Agora você pode continuar pelo WhatsApp para esclarecer as condições e conhecer os próximos passos.
      </p>

      {whatsappUrl ? (
        <button type="button" onClick={onOpen} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.99]">
          <MessageCircle className="h-5 w-5" aria-hidden /> CONTINUAR PELO WHATSAPP
        </button>
      ) : (
        <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {whatsappConfigured
            ? "Não foi possível gerar o link do WhatsApp agora. Nossa equipe entrará em contato."
            : "Recebemos seus dados. Nossa equipe entrará em contato em breve."}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-400">Ao tocar no botão, o WhatsApp abrirá com uma mensagem pronta — você ainda precisa enviá-la.</p>
    </section>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-ink-500 transition hover:text-ink-800">
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
