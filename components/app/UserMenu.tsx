"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { useProfile } from "@/lib/auth/useProfile";
import { signOut } from "@/lib/auth/actions";
import { StatusBadge } from "./ui/Primitives";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  supervisor: "Superviseur",
  user: "Citoyen",
};

export function UserMenu() {
  const { data } = useProfile();
  const initials = (data?.profile?.full_name || data?.email || "N N")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "·";

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Menu utilisateur"
        className="h-8 flex items-center gap-2 pr-2 pl-1 rounded-md hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--nafas-accent)]/40"
      >
        <div className="size-7 rounded-full bg-[color:var(--nafas-bg3)] border border-white/10 grid place-items-center text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider text-[color:var(--nafas-surface)]">
          {initials}
        </div>
        <span className="hidden sm:block text-[10px] text-[color:var(--nafas-ink3)]">▾</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-[120] outline-none">
          <Menu.Popup className="min-w-[240px] rounded-lg border border-white/10 bg-[color:var(--nafas-bg2)] shadow-[0_24px_56px_-16px_rgba(0,0,0,0.85)] p-1.5 outline-none">
            <div className="px-2.5 py-2">
              <div className="text-[13px] text-[color:var(--nafas-surface)] truncate">
                {data?.profile?.full_name || data?.email || "Invité"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                {data?.role ? (
                  <StatusBadge tone={data.role === "admin" ? "accent" : "blue"}>
                    {ROLE_LABEL[data.role] ?? data.role}
                  </StatusBadge>
                ) : null}
              </div>
            </div>
            <div className="h-px bg-white/5 my-1" />
            <Menu.Item
              render={<Link href="/app/parametres/moi" />}
              className="block px-2.5 py-1.5 text-[13px] text-[color:var(--nafas-surface)] rounded-md data-[highlighted]:bg-white/5 cursor-pointer outline-none"
            >
              Mon profil
            </Menu.Item>
            <Menu.Item
              render={<Link href="/dawa" />}
              className="block px-2.5 py-1.5 text-[13px] text-[color:var(--nafas-surface)] rounded-md data-[highlighted]:bg-white/5 cursor-pointer outline-none"
            >
              Voir comme Amina
              <span className="block text-[11px] text-[color:var(--nafas-ink3)] mt-0.5">
                L&apos;expérience citoyenne /dawa
              </span>
            </Menu.Item>
            <div className="h-px bg-white/5 my-1" />
            <Menu.Item
              onClick={() => {
                void signOut("/");
              }}
              className="block w-full text-left px-2.5 py-1.5 text-[13px] text-[color:var(--nafas-danger)] rounded-md data-[highlighted]:bg-[color:var(--nafas-danger)]/10 cursor-pointer outline-none"
            >
              Se déconnecter
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
