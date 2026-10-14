"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="bg-quiz grid min-h-[100svh] place-items-center px-6 text-center">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-ink-600">Tente novamente em instantes.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white">Tentar de novo</button>
      </div>
    </main>
  );
}
