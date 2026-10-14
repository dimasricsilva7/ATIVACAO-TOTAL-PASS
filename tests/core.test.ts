import { test } from "node:test";
import assert from "node:assert/strict";
import { leadSchema, eventSchema } from "../src/lib/validation";
import { isValidAnswer, labelFor } from "../src/lib/quiz";
import { isValidPhone } from "../src/utils/validators";
import { validateCrediario, installmentOptions, maskValidity, installmentCents } from "../src/lib/crediario";

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

test("crediario: valida protocolo/validade/cpf/parcelas", () => {
  const futura = "12/39";
  const ok = validateCrediario({ protocol: "1234567812345678", validity: futura, cpfLast3: "123", installments: 3 }, 12);
  assert.deepEqual(ok, {});
  const bad = validateCrediario({ protocol: "123", validity: "13/39", cpfLast3: "1", installments: 99 }, 12);
  assert.ok(bad.protocol && bad.validity && bad.cpfLast3 && bad.installments);
  // validade vencida
  assert.ok(validateCrediario({ protocol: "1234567812345678", validity: "01/20", cpfLast3: "123", installments: 1 }, 12).validity);
});

test("crediario: parcelas nunca cobram menos que o total e máscara de validade", () => {
  assert.equal(maskValidity("1228"), "12/28");
  const opts = installmentOptions(24990, 3);
  assert.equal(opts.length, 3);
  assert.ok(installmentCents(24990, 3) * 3 >= 24990);
});

test("quiz labelFor e isValidAnswer", () => {
  assert.equal(labelFor("objetivo", "comecar_treinar"), "Quero começar a treinar.");
  assert.equal(labelFor("objetivo", "x"), "x");
  assert.ok(isValidAnswer("respostaTaxa", "ciente"));
  assert.equal(isValidAnswer("respostaTaxa", "nope"), false);
});
