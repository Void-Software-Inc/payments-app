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
      <body
        className={`${geistSans.variable} ${geistMono.variable} app-gradient-bg antialiased min-h-screen`}
      >
      <Providers>
        <div className="half-round-glow"></div>
        <div className="relative z-10">
          <Navbar />
          {children}
        
          <Toaster richColors/>
        </div>
      </Providers>
      </body>
    </html>
  );
}
