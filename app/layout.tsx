import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NAFAS · Gabès — La ville qui respire du phosphate",
  description:
    "Plateforme IA de surveillance et remédiation de la pollution industrielle à Gabès, Tunisie. Capteurs, diagnostic, interventions, forecast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark h-full antialiased ${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body
        className="min-h-full bg-[color:var(--nafas-bg)] text-[color:var(--nafas-surface)]"
        style={{ fontFamily: "var(--font-inter), -apple-system, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
