import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/server/settings";
import { envHealth, siteUrl } from "@/lib/env";
import { Card } from "@/components/admin/ui";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  await requireAdmin();
  const settings = await getSettings();
  const checks = envHealth();
  const base = siteUrl();

  return (
    <div className="flex flex-col gap-6">
      <Card title="Configurações do funil e checkout">
        <SettingsForm settings={settings} />
      </Card>

      <Card
        title="Link do checkout (para enviar no WhatsApp)"
        action={
          <Link href="/checkout" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
            Abrir <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        }
      >
        <p className="text-sm text-ink-600">Envie este link direto ao cliente para ele pagar e finalizar a ativação:</p>
        <code className="mt-2 block w-full overflow-x-auto rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-700">{base}/checkout</code>
        <p className="mt-2 text-xs text-ink-400">Dica: na tabela de leads, cada lead tem um botão que abre o checkout já ligado à sessão dele.</p>
      </Card>

      <Card title="Diagnóstico das variáveis de ambiente">
        <ul className="flex flex-col gap-1.5 text-sm">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2">
              <span className={`mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-brand-500" : c.required ? "bg-red-500" : "bg-ink-300"}`} />
              <span>
                <code className="font-semibold text-ink-800">{c.key}</code>{" "}
                <span className="text-ink-400">— {c.hint}{!c.ok && c.required ? " (faltando)" : ""}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-400">Para o checkout cobrar de verdade: configure <code>BRAVOPAY_API_KEY</code> e <code>BRAVOPAY_WEBHOOK_SECRET</code>. Sem elas, o checkout informa que o pagamento está indisponível (não gera cobrança falsa).</p>
      </Card>
    </div>
  );
}
