/**
 * CREDIÁRIO — método próprio baseado em protocolo (NÃO é cartão de crédito).
 * Regras puras, compartilhadas pelo checkout (navegador), pela API (servidor) e
 * pelos testes. Protocolo de 16 dígitos, validade MM/AA, últimos 3 do CPF.
 */

export const PROTOCOL_DIGITS = 16;
export const CPF_LAST_DIGITS = 3;

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Máscara da validade MM/AA (ex.: "1228" → "12/28"). */
export function maskValidity(raw: string): string {
  const d = onlyDigits(raw).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Valida validade MM/AA e devolve o último instante válido, ou null se inválida. */
export function parseValidity(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month, 0, 23, 59, 59)); // último dia do mês
}

export type CrediarioInput = { protocol: string; validity: string; cpfLast3: string; installments: number };

/** Validação (mesma regra no navegador e no servidor). Retorna erros por campo. */
export function validateCrediario(input: CrediarioInput, maxInstallments: number, now = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!new RegExp(`^\\d{${PROTOCOL_DIGITS}}$`).test(input.protocol ?? "")) errors.protocol = `Informe os ${PROTOCOL_DIGITS} dígitos do protocolo.`;
  const validity = parseValidity(input.validity ?? "");
  if (!validity) errors.validity = "Informe a validade no formato MM/AA.";
  else if (validity.getTime() < now.getTime()) errors.validity = "Protocolo vencido.";
  if (!new RegExp(`^\\d{${CPF_LAST_DIGITS}}$`).test(input.cpfLast3 ?? "")) errors.cpfLast3 = `Informe os ${CPF_LAST_DIGITS} últimos dígitos do CPF.`;
  if (!Number.isInteger(input.installments) || input.installments < 1 || input.installments > maxInstallments) errors.installments = "Escolha o número de parcelas.";
  return errors;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (c: number) => brl.format(c / 100).replace(/ /g, " ");

/** Valor da parcela (arredonda para cima no centavo — nunca cobra menos que o total). */
export const installmentCents = (totalCents: number, n: number) => Math.ceil(totalCents / Math.max(1, n));

export function installmentOptions(totalCents: number, maxInstallments: number) {
  return Array.from({ length: Math.max(1, maxInstallments) }, (_, i) => {
    const n = i + 1;
    const cents = installmentCents(totalCents, n);
    return { n, cents, label: `${n}x de ${money(cents)}` };
  });
}

/** "1234567812345678" → "1234 5678 1234 5678" (exibição no admin). */
export const formatProtocol = (p: string) => p.replace(/(\d{4})(?=\d)/g, "$1 ");
