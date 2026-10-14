import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Aviso de Privacidade", robots: { index: true, follow: false } };

export default function PrivacidadePage() {
  return (
    <main className="bg-ink-50 min-h-[100svh]">
      <article className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/" className="text-sm font-semibold text-brand-700">← Voltar</Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900">Aviso de Privacidade</h1>
        <p className="mt-2 text-sm text-ink-500">Tratamento de dados conforme a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>

        <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-ink-700">
          <section>
            <h2 className="text-base font-bold text-ink-900">Quais dados coletamos</h2>
            <p className="mt-1">Nome, WhatsApp, e-mail, cidade/estado e as respostas do quiz. Não solicitamos CPF, documentos, senhas ou dados de cartão.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink-900">Para que usamos</h2>
            <p className="mt-1">Exclusivamente para entrar em contato e dar continuidade ao atendimento sobre o serviço de intermediação para acesso ao TotalPass, e para medir o desempenho das nossas campanhas de forma agregada.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink-900">Serviço de intermediação</h2>
            <p className="mt-1">Somos um serviço independente de intermediação. A taxa informada refere-se exclusivamente ao nosso serviço e não é uma taxa oficial da TotalPass. Não garantimos aprovação ou acesso; as condições de elegibilidade são confirmadas durante o atendimento.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink-900">Compartilhamento e segurança</h2>
            <p className="mt-1">Seus dados não são vendidos. Usamos ferramentas de anúncios (como o Meta) apenas com identificadores técnicos e dados agregados — nunca enviamos seu nome, telefone ou e-mail nos parâmetros de rastreamento.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-ink-900">Seus direitos</h2>
            <p className="mt-1">Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo mesmo canal de atendimento (WhatsApp) em que foi contatado.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
