import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@/components/Analytics";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Treinar com TotalPass — conheça as opções",
  description:
    "Responda algumas perguntas rápidas e conheça as condições e os próximos passos para solicitar atendimento ao nosso serviço de intermediação.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Quer conhecer as opções para treinar com TotalPass?",
    description: "Responda o quiz rápido e fale com nossa equipe pelo WhatsApp.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0ca678",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <Suspense>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
