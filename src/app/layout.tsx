import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FUEL — Nutrition Tracker",
  description: "Minimalist AI-powered nutrition tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FUEL",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
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
    <html lang="fr" className={`${inter.variable} dark`}>
      <body className="min-h-dvh flex flex-col bg-[#020617] text-slate-200 pb-20">
        <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
