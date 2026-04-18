import type { Metadata, Viewport } from "next";
import { DawaProviders } from "@/components/dawa/DawaProviders";

export const metadata: Metadata = {
  title: "NAFAS · Dawa’",
  description:
    "Dawa’ — Compagnon citoyen NAFAS. Qualité de l’air, alertes et trajet sûr à Gabès.",
  applicationName: "Dawa’",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dawa’",
  },
  icons: {
    icon: [
      { url: "/icons/dawa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/dawa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/dawa-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1D9E75",
};

export default function DawaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] w-full bg-[color:var(--nafas-bg)] text-[color:var(--nafas-surface)]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <DawaProviders>
        <div className="mx-auto w-full max-w-[480px] min-h-[100dvh] relative">
          {children}
        </div>
      </DawaProviders>
    </div>
  );
}
