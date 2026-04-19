import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: {
    default: "NAFAS",
    template: "%s · NAFAS",
  },
  description: "Plateforme NAFAS — surveillance et remédiation · Municipalité de Gabès",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
