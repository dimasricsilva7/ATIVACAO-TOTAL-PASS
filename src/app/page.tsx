import { QuizClient } from "@/components/quiz/QuizClient";
import { feeCents, whatsappPhone } from "@/lib/env";
import { formatBRL } from "@/utils/format";

export default function HomePage() {
  const fee = feeCents();
  return (
    <main className="bg-quiz min-h-[100svh]">
      <QuizClient feeBRL={formatBRL(fee)} whatsappConfigured={Boolean(whatsappPhone())} />
    </main>
  );
}
