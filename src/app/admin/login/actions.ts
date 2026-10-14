"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, createSession, isLoginBlocked, recordLoginAttempt } from "@/lib/auth";
import { hashIp } from "@/lib/crypto";
import { getClientIp } from "@/lib/request";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };

  const ipHash = hashIp(getClientIp(await headers()));
  if (await isLoginBlocked(email, ipHash)) {
    return { error: "Muitas tentativas. Tente novamente em alguns minutos." };
  }

  const admin = await authenticate(email, password);
  await recordLoginAttempt(email, ipHash, Boolean(admin));
  if (!admin) return { error: "Credenciais inválidas." };

  await createSession(admin.id);
  redirect("/admin");
}
