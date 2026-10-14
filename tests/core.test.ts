import { test } from "node:test";
import assert from "node:assert/strict";
import { leadSchema, eventSchema } from "../src/lib/validation";
import { isValidAnswer, labelFor } from "../src/lib/quiz";
import { isValidPhone } from "../src/utils/validators";

const baseLead = {
  sessionId: "aaaaaaaaaaaaaaaa1234",
  nome: "Maria Silva",
  telefone: "(11) 99999-8888",
  email: "Maria@Email.com",
  cidade: "São Paulo",
  estado: "SP",
  objetivo: "comecar_treinar",
  acessoAtual: "sem_acesso",
  preferenciaTreino: "perto_casa",
  respostaTaxa: "ciente",
  consent: true,
  utm: { source: "ig", campaign: "out-leads" },
};

test("leadSchema aceita lead válido e normaliza telefone/email", () => {
  const r = leadSchema.safeParse(baseLead);
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
  assert.equal(r.data.telefone, "11999998888");
  assert.equal(r.data.email, "maria@email.com");
});

test("leadSchema exige nome e sobrenome", () => {
  const r = leadSchema.safeParse({ ...baseLead, nome: "Maria" });
  assert.equal(r.success, false);
});

test("leadSchema exige consentimento", () => {
  const r = leadSchema.safeParse({ ...baseLead, consent: false });
  assert.equal(r.success, false);
});

test("leadSchema rejeita UF inválida e e-mail inválido", () => {
  assert.equal(leadSchema.safeParse({ ...baseLead, estado: "XX" }).success, false);
  assert.equal(leadSchema.safeParse({ ...baseLead, email: "nao-email" }).success, false);
});

test("eventSchema valida tipos conhecidos", () => {
  assert.ok(eventSchema.safeParse({ sessionId: "aaaaaaaaaaaaaaaa1234", type: "quiz_started", utm: {} }).success);
  assert.equal(eventSchema.safeParse({ sessionId: "aaaaaaaaaaaaaaaa1234", type: "foo" }).success, false);
});

test("isValidPhone cobre celular e fixo", () => {
  assert.ok(isValidPhone("11999998888"));
  assert.equal(isValidPhone("1199"), false);
});

test("quiz labelFor e isValidAnswer", () => {
  assert.equal(labelFor("objetivo", "comecar_treinar"), "Quero começar a treinar.");
  assert.equal(labelFor("objetivo", "x"), "x");
  assert.ok(isValidAnswer("respostaTaxa", "ciente"));
  assert.equal(isValidAnswer("respostaTaxa", "nope"), false);
});
