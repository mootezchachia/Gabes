"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "dawa.install.dismissed_at";
const DISMISS_MS = 7 * 24 * 3600_000;

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  type NavWithStandalone = Navigator & { standalone?: boolean };
  const iosStandalone = (window.navigator as NavWithStandalone).standalone;
  return Boolean(mq || iosStandalone);
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AminaInstallHint() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

    setPlatform(detectPlatform());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Show hint for iOS immediately (no beforeinstallprompt there).
    if (detectPlatform() === "ios") setShow(true);

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setShow(false);
  };

  async function promptInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* noop */
    } finally {
      setDeferred(null);
      dismiss();
    }
  }

  return (
    <div
      className="mx-4 mt-2 rounded-xl border border-[color:var(--nafas-accent2)]/25 bg-[color:var(--nafas-accent)]/5 p-3"
      role="region"
      aria-label="Installer l’app Dawa"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="size-8 shrink-0 rounded-lg bg-[color:var(--nafas-accent)]/20 text-[color:var(--nafas-accent2)] inline-flex items-center justify-center"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          N
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="text-[13.5px] italic font-light text-[color:var(--nafas-surface)]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Installer Dawa’ sur ton écran d’accueil
          </div>
          <p className="mt-1 text-[12px] leading-[1.5] text-[color:var(--nafas-ink3)]">
            {platform === "ios"
              ? "Sur iPhone: touche l’icône Partager puis « Ajouter à l’écran d’accueil »."
              : platform === "android"
                ? "Ajoute l’app à ton téléphone pour un accès rapide aux alertes."
                : "Installe l’app pour recevoir les alertes même hors connexion."}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {platform === "android" && deferred ? (
              <button
                type="button"
                onClick={promptInstall}
                className="h-8 px-3 rounded-md bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black text-[12px] font-medium"
              >
                Installer
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="h-8 px-3 rounded-md border border-white/[0.08] text-[12px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
