"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { assignTopics, getTopicPrefix } from "@/lib/dawa/assignTopics";
import {
  NTFY_APPS,
  ntfySubscribeDeepLink,
  ntfyWebUrl,
} from "@/lib/dawa/ntfy";
import { getDawaClient } from "@/lib/dawa/supabase";
import type { LonLat, Profile, Zone } from "@/lib/dawa/types";
import { LocationPicker } from "./LocationPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  zones: Zone[];
  fullScreen?: boolean;
}

export function SettingsSheet({
  open,
  onClose,
  profile,
  zones,
  fullScreen = false,
}: Props) {
  const [pickerFor, setPickerFor] = useState<"home" | "school" | null>(null);
  const [home, setHome] = useState<LonLat | null>(profile?.homeLocation ?? null);
  const [school, setSchool] = useState<LonLat | null>(
    profile?.schoolLocation ?? null,
  );
  const [locale, setLocale] = useState<Profile["preferredLocale"]>(
    profile?.preferredLocale ?? "fr",
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [copiedTopic, setCopiedTopic] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setHome(profile?.homeLocation ?? null);
    setSchool(profile?.schoolLocation ?? null);
    setLocale(profile?.preferredLocale ?? "fr");
  }, [profile]);

  const topics = useMemo(
    () => assignTopics(home, school, zones, { prefix: getTopicPrefix() }),
    [home, school, zones],
  );

  async function persistLocation(
    kind: "home" | "school",
    value: LonLat | null,
  ) {
    setSavingKey(kind);
    try {
      if (kind === "home") setHome(value);
      else setSchool(value);
      const sb = await getDawaClient();
      if (sb && profile?.userId) {
        const column =
          kind === "home" ? "home_location" : "school_location";
        const wkt = value ? `POINT(${value[0]} ${value[1]})` : null;
        await sb
          .from("profiles")
          .update({ [column]: wkt })
          .eq("user_id", profile.userId);
      }
      // Also re-sync user_ntfy_topics.
      if (sb && profile?.userId) {
        const next = assignTopics(
          kind === "home" ? value : home,
          kind === "school" ? value : school,
          zones,
          { prefix: getTopicPrefix() },
        );
        try {
          await sb.from("user_ntfy_topics").delete().eq("user_id", profile.userId);
          if (next.length > 0) {
            await sb.from("user_ntfy_topics").insert(
              next.map((t) => ({ user_id: profile.userId, topic: t })),
            );
          }
        } catch {
          /* non-fatal */
        }
      }
      qc.invalidateQueries({ queryKey: ["dawa", "profile"] });
    } finally {
      setSavingKey(null);
    }
  }

  async function persistLocale(next: Profile["preferredLocale"]) {
    setLocale(next);
    setSavingKey("locale");
    try {
      const sb = await getDawaClient();
      if (sb && profile?.userId) {
        await sb
          .from("profiles")
          .update({ preferred_locale: next })
          .eq("user_id", profile.userId);
      }
      qc.invalidateQueries({ queryKey: ["dawa", "profile"] });
    } finally {
      setSavingKey(null);
    }
  }

  async function logout() {
    const sb = await getDawaClient();
    try {
      await sb?.auth.signOut();
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres"
      className="fixed inset-0 z-[50] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={
          "relative w-full max-w-[480px] bg-[color:var(--nafas-bg2)] border border-white/[0.08] overflow-y-auto " +
          (fullScreen
            ? "h-[100dvh] rounded-none"
            : "max-h-[90dvh] rounded-t-2xl md:rounded-2xl")
        }
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b border-white/[0.06] bg-[color:var(--nafas-bg2)]/95 backdrop-blur">
          <h2
            className="italic font-light tracking-[-0.02em] text-[17px] text-[color:var(--nafas-surface)]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Mes paramètres
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="h-8 w-8 rounded-full border border-white/[0.08] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-6">
          <Section label="Mes lieux">
            <LocationRow
              label="Maison"
              value={home}
              onEdit={() => setPickerFor("home")}
              saving={savingKey === "home"}
            />
            <LocationRow
              label="École"
              value={school}
              onEdit={() => setPickerFor("school")}
              saving={savingKey === "school"}
            />
          </Section>

          <Section label="Langue">
            <div className="flex items-center gap-2">
              {(["fr", "ar", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => persistLocale(l)}
                  aria-pressed={locale === l}
                  className={
                    "h-9 px-3 rounded-md border text-[12.5px] transition-colors " +
                    (locale === l
                      ? "border-[color:var(--nafas-accent2)]/50 bg-[color:var(--nafas-accent2)]/10 text-[color:var(--nafas-accent2)]"
                      : "border-white/[0.08] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]")
                  }
                >
                  {l === "fr"
                    ? "Français"
                    : l === "ar"
                      ? "العربية (stub)"
                      : "English"}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Notifications ntfy">
            <p className="text-[12px] leading-[1.5] text-[color:var(--nafas-ink3)]">
              Vous serez notifié des alertes critiques dans ces zones. Installe
              l’app ntfy, puis touche « Ouvrir dans ntfy » pour t’abonner.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={NTFY_APPS.ios}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04]"
              >
                App Store (iOS)
              </a>
              <a
                href={NTFY_APPS.android}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04]"
              >
                Play Store (Android)
              </a>
              <a
                href={NTFY_APPS.desktop}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04]"
              >
                ntfy.sh (web)
              </a>
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {topics.map((t) => (
                <li
                  key={t}
                  className="rounded-md border border-white/[0.06] bg-[color:var(--nafas-bg3)]/50 p-3"
                >
                  <div
                    className="text-[11px] tabular-nums text-[color:var(--nafas-surface)] break-all"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {t}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <a
                      href={ntfySubscribeDeepLink(t)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black text-[12px] font-medium"
                    >
                      Ouvrir dans ntfy
                    </a>
                    <a
                      href={ntfyWebUrl(t)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04]"
                    >
                      Voir sur ntfy.sh
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard?.writeText(t);
                          setCopiedTopic(t);
                          setTimeout(() => setCopiedTopic(null), 1500);
                        } catch {
                          /* noop */
                        }
                      }}
                      className="inline-flex items-center h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]"
                    >
                      {copiedTopic === t ? "Copié ✓" : "Copier"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section label="Accès">
            <Link
              href="/app/carte"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-white/[0.08] text-[12.5px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04]"
            >
              Voir la carte complète →
            </Link>
          </Section>

          <Section label="Compte">
            <button
              type="button"
              onClick={logout}
              className="h-9 px-3 rounded-md border border-[color:var(--nafas-danger)]/30 text-[color:var(--nafas-danger)] text-[12.5px] hover:bg-[color:var(--nafas-danger)]/10"
            >
              Se déconnecter
            </button>
          </Section>
        </div>
      </div>

      <LocationPicker
        open={pickerFor !== null}
        title={pickerFor === "home" ? "Choisir la maison" : "Choisir l’école"}
        initial={pickerFor === "home" ? home : school}
        onCancel={() => setPickerFor(null)}
        onConfirm={(p) => {
          if (pickerFor) persistLocation(pickerFor, p);
          setPickerFor(null);
        }}
      />
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3
        className="text-[10.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {label}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function LocationRow({
  label,
  value,
  onEdit,
  saving,
}: {
  label: string;
  value: LonLat | null;
  onEdit: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.06] bg-[color:var(--nafas-bg3)]/50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[12.5px] text-[color:var(--nafas-surface)]">
          {label}
        </div>
        <div
          className="text-[10.5px] tabular-nums text-[color:var(--nafas-ink3)] truncate"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {value
            ? `${value[1].toFixed(4)}° N, ${value[0].toFixed(4)}° E`
            : "Non défini"}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        disabled={saving}
        className="h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04] disabled:opacity-50"
      >
        {saving ? "…" : value ? "Modifier" : "Choisir"}
      </button>
    </div>
  );
}
