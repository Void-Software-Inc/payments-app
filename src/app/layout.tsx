import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles.css";
import { Navbar } from "@/components/Navbar";
import { DebugButton } from "@/components/DebugButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drift",
  description: "Payments Dapp for SUI powered by Account.tech",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Drift",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "Drift",
  },
  icons: {
    icon: "/drift_logo.svg",
    apple: "/drift_logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/drift_logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/drift_logo.svg" />
        <meta name="application-name" content="Drift" />
        <meta name="apple-mobile-web-app-title" content="Drift" />
        <meta name="theme-color" content="#212229" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} app-gradient-bg antialiased min-h-screen`}
      >
      <Providers>
        <div className="half-round-glow"></div>
        <div className="relative z-10">
          <Navbar />
          {children}
          <DebugButton />
          <Toaster richColors/>
        </div>
      </Providers>
      
      </body>
    </html>
  );
}
