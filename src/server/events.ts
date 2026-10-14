import "server-only";
import type { QuizEventType } from "@prisma/client";
import { db } from "@/lib/db";
import type { EventInput } from "@/lib/validation";

/**
 * Registra um evento do funil. A deduplicação é garantida pela chave única
 * (sessionId, type) no banco: recarregar a página não conta o mesmo evento duas vezes.
 */
export async function recordEvent(input: EventInput): Promise<void> {
  await db.quizEvent.createMany({
    data: [
      {
        sessionId: input.sessionId,
        type: input.type as QuizEventType,
        utmSource: input.utm?.source ?? null,
        utmCampaign: input.utm?.campaign ?? null,
      },
    ],
    skipDuplicates: true,
  });
}
