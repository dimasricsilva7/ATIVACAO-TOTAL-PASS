import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-quiz grid min-h-[100svh] place-items-center px-6 text-center">
      <div>
        <p className="text-5xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-2 text-xl font-bold text-ink-900">Página não encontrada</h1>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white">Voltar ao início</Link>
      </div>
    </main>
  );
}
