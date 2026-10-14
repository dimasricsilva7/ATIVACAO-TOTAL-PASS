import { z } from "zod";
import { isValidPhone, onlyDigits, UF_LIST } from "@/utils/validators";

const optStr = (max: number) => z.string().trim().max(max).optional().nullable();

export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

export const utmSchema = z
  .object({
    source: optStr(200),
    medium: optStr(200),
    campaign: optStr(200),
    content: optStr(200),
    term: optStr(200),
    fbclid: optStr(500),
  })
  .partial()
  .optional()
  .nullable();

const answerEnum = {
  objetivo: ["treino_mais_opcoes", "comecar_treinar", "saude_bem_estar"],
  acessoAtual: ["sem_acesso", "com_acesso"],
  preferenciaTreino: ["perto_casa", "perto_trabalho", "varias_regioes"],
  respostaTaxa: ["ciente", "duvidas"],
} as const;

/** Envio final do lead. Respostas de qualificação não excluem ninguém — apenas registram. */
export const leadSchema = z.object({
  sessionId: sessionIdSchema,
  nome: z
    .string()
    .trim()
    .min(5, "Informe seu nome completo")
    .max(120)
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome"),
  telefone: z.string().transform(onlyDigits).refine(isValidPhone, "WhatsApp inválido"),
  email: z.string().trim().toLowerCase().max(160).email("E-mail inválido"),
  cidade: z.string().trim().min(2, "Informe a cidade").max(80),
  estado: z.enum(UF_LIST, { message: "UF inválida" }),
  objetivo: z.enum(answerEnum.objetivo).optional().nullable(),
  acessoAtual: z.enum(answerEnum.acessoAtual).optional().nullable(),
  preferenciaTreino: z.enum(answerEnum.preferenciaTreino).optional().nullable(),
  respostaTaxa: z.enum(answerEnum.respostaTaxa).optional().nullable(),
  consent: z.literal(true, { message: "É necessário aceitar o aviso de privacidade" }),
  utm: utmSchema,
  // Anti-robô: campo isca (sempre vazio) e tempo desde a abertura do quiz.
  hp: z.string().max(200).optional(),
  elapsedMs: z.number().int().min(0).max(864_000_000).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Registro de evento do funil (deduplicado por sessão no banco). */
export const eventSchema = z.object({
  sessionId: sessionIdSchema,
  type: z.enum(["quiz_started", "fee_step_reached", "lead_submitted", "whatsapp_clicked"]),
  utm: utmSchema,
});
export type EventInput = z.infer<typeof eventSchema>;
