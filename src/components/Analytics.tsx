import Script from "next/script";

/**
 * Carrega Meta Pixel e GA4 apenas se os IDs estiverem configurados. Sem eles,
 * a aplicação funciona normalmente. O Pixel dispara PageView automaticamente;
 * os eventos QuizStarted, Lead e Contact são disparados pelo cliente do quiz
 * (lib/pixel.ts) — nunca com dados pessoais nos parâmetros.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  // Suporta um ou vários pixels (separados por vírgula): inicializa cada um.
  const pixelIds = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{5,}$/.test(s));

  return (
    <>
      {pixelIds.length > 0 && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            ${pixelIds.map((id) => `fbq('init','${id}');`).join("")}fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${pixelIds[0]}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}

      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
    </>
  );
}
