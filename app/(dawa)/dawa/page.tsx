import { Suspense } from "react";
import { DawaClient } from "@/components/dawa/DawaClient";

export const dynamic = "force-dynamic";

export default function DawaPage() {
  return (
    <Suspense fallback={<DawaShellSkeleton />}>
      <DawaClient />
    </Suspense>
  );
}

function DawaShellSkeleton() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-14 border-b border-white/[0.06]" />
      <div className="pt-10 pb-4 flex flex-col items-center">
        <div
          className="text-[10.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)] mb-3"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Chargement…
        </div>
        <div
          className="mx-auto rounded-full border border-white/[0.08]"
          style={{ width: 240, height: 240 }}
        />
      </div>
    </div>
  );
}
