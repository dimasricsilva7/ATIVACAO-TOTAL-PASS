import { QuizClient } from "@/components/quiz/QuizClient";
import { getSettings } from "@/server/settings";
import { resolveWhatsappPhone } from "@/server/whatsapp";
import { formatBRL } from "@/utils/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  return (
    <main className="bg-stage min-h-[100svh]">
      <QuizClient
        feeBRL={formatBRL(settings.priceCents)}
        ctaMode={settings.ctaMode}
        whatsappConfigured={Boolean(resolveWhatsappPhone(settings.whatsappPhone))}
      />
    </main>
  );
}
