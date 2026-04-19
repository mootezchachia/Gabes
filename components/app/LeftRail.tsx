"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Map, Boxes, BarChart3, Settings2 } from "lucide-react";

const TABS: ReadonlyArray<{
  href: string;
  match?: string;
  label: string;
  Icon: typeof Map;
}> = [
  { href: "/app/carte", label: "Carte", Icon: Map },
  { href: "/app/objets/panneaux", match: "/app/objets", label: "Objets", Icon: Boxes },
  { href: "/app/analytique", label: "Analytique", Icon: BarChart3 },
  {
    href: "/app/parametres/utilisateurs",
    match: "/app/parametres",
    label: "Paramètres",
    Icon: Settings2,
  },
];

export function LeftRail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav
        aria-label="Navigation principale"
        className="hidden md:flex flex-col w-[72px] shrink-0 border-r border-white/5 bg-[color:var(--nafas-bg)]/60 py-3 gap-1"
      >
        {TABS.map(({ href, match, label, Icon }) => {
          const active = pathname.startsWith(match ?? href);
          return (
            <Link
              key={label}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mx-2 h-14 rounded-md flex flex-col items-center justify-center gap-1 transition-colors",
                active
                  ? "bg-[color:var(--nafas-bg3)] text-[color:var(--nafas-surface)]"
                  : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.6} />
              <span className="text-[10px] tracking-wide">{label}</span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-0 w-[3px] h-6 bg-[color:var(--nafas-accent)] rounded-r-full"
                  style={{ marginLeft: "-8px" }}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav
        aria-label="Navigation principale"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 h-14 border-t border-white/5 bg-[color:var(--nafas-bg)]/95 backdrop-blur-xl flex items-stretch"
      >
        {TABS.map(({ href, match, label, Icon }) => {
          const active = pathname.startsWith(match ?? href);
          return (
            <Link
              key={label}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active
                  ? "text-[color:var(--nafas-accent2)]"
                  : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.6} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
