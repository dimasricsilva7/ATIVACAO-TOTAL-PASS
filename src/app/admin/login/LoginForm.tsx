"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Lock } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-bold text-white transition enabled:hover:bg-brand-700 disabled:opacity-60">
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />} Entrar
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-ink-700">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="h-12 rounded-xl border-2 border-ink-200 bg-white px-3 outline-none focus:border-brand-400" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-ink-700">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 rounded-xl border-2 border-ink-200 bg-white px-3 outline-none focus:border-brand-400" />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
