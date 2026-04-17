"use client";
// STUB — replaced by Agent B
import { useMonitor } from "@/lib/monitor/store";

export function AminaModal() {
  const open = useMonitor((s) => s.aminaModalOpen);
  const setOpen = useMonitor((s) => s.setAminaModalOpen);
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div className="p-6 bg-[color:var(--nafas-bg2)] border border-white/10 rounded-xl max-w-lg">
        <div className="text-sm text-[color:var(--nafas-ink3)]">
          AminaModal · Agent B pending. Click anywhere to close.
        </div>
      </div>
    </div>
  );
}
