import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppProvider, useApp } from "@/context/AppContext";
import "@/styles/globals.css";

function AppContent({ Component, pageProps }: AppProps) {
  const { data } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!data) return;
    const isOnboarding = router.pathname === "/onboarding";
    if (!data.onboardingDone && !isOnboarding) {
      router.replace("/onboarding");
    }
  }, [data, router]);

  return <Component {...pageProps} />;
}

export default function App(props: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f1117" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EconoMind" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <title>EconoMind</title>
      </Head>
      <AppProvider>
        <AppContent {...props} />
      </AppProvider>
    </>
  );
}
