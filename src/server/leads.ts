import "server-only";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import type { LeadInput } from "@/lib/validation";

/**
 * Cria (ou atualiza, se a mesma sessão reenviar) o lead e registra o evento
 * lead_submitted na mesma transação. Deduplica por sessionId.
 */
export async function saveLead(input: LeadInput, ip: string | null) {
  const data = {
    nome: input.nome,
    telefone: input.telefone,
    email: input.email,
    cidade: input.cidade,
    estado: input.estado,
    objetivo: input.objetivo ?? null,
    acessoAtual: input.acessoAtual ?? null,
    preferenciaTreino: input.preferenciaTreino ?? null,
    respostaTaxa: input.respostaTaxa ?? null,
    origem: "quiz",
    utmSource: input.utm?.source ?? null,
    utmMedium: input.utm?.medium ?? null,
    utmCampaign: input.utm?.campaign ?? null,
    utmContent: input.utm?.content ?? null,
    utmTerm: input.utm?.term ?? null,
    fbclid: input.utm?.fbclid ?? null,
    marketingConsent: input.consent === true,
    ipHash: hashIp(ip),
  };

  const [lead] = await db.$transaction([
    db.lead.upsert({
      where: { sessionId: input.sessionId },
      create: { sessionId: input.sessionId, ...data },
      update: data,
    }),
    db.quizEvent.createMany({
      data: [
        {
          sessionId: input.sessionId,
          type: "lead_submitted",
          utmSource: input.utm?.source ?? null,
          utmCampaign: input.utm?.campaign ?? null,
        },
      ],
      skipDuplicates: true,
    }),
  ]);

  return lead;
}
