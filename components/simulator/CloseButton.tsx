import Link from "next/link";
import { X } from "lucide-react";

export function CloseButton() {
  return (
    <Link
      href="/"
      aria-label="Fermer le simulateur"
      className="absolute top-4 right-4 z-30 size-10 grid place-items-center rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/10 text-[color:var(--nafas-surface)] transition-colors"
    >
      <X className="size-4" strokeWidth={1.5} />
    </Link>
  );
}
