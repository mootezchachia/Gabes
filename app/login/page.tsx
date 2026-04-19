import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Se connecter · HealiX",
  description: "Connexion à la plateforme HealiX · Municipalité de Gabès",
};

type SearchParams = Promise<{ next?: string; reason?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, reason } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-dvh flex">
      {/* Editorial left column */}
      <section className="hidden md:flex flex-col flex-1 relative overflow-hidden border-r border-white/5">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 25%, rgba(29,158,117,0.20), transparent 60%), radial-gradient(ellipse 60% 50% at 75% 75%, rgba(62,201,208,0.10), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="relative flex-1 flex flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-2.5 w-max group">
            <div className="size-7 rounded-md bg-[color:var(--nafas-accent)] grid place-items-center text-black font-[family-name:var(--font-fraunces)] text-[15px] italic group-hover:bg-[color:var(--nafas-accent2)] transition-colors">
              N
            </div>
            <div className="text-[14px] font-medium tracking-wide">
              HealiX <span className="text-[color:var(--nafas-ink3)] font-normal">· Gabès</span>
            </div>
          </Link>

          <div className="max-w-[42ch]">
            <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]">
              Plateforme municipale
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[0.98] text-[clamp(40px,5.5vw,68px)]">
              La ville qui{" "}
              <em className="not-italic italic font-light text-[color:var(--nafas-accent2)]">
                respire
              </em>
              .
            </h1>
            <p className="mt-6 text-[14.5px] leading-[1.6] text-[color:var(--nafas-ink3)]">
              Connectez-vous pour accéder à la surveillance, aux interventions et aux rapports de
              la Municipalité de Gabès.
            </p>
          </div>

          <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.16em] uppercase text-[color:var(--nafas-ink3)]/70">
            · Accès réservé · chaque session journalisée
          </div>
        </div>
      </section>

      {/* Form column */}
      <section className="w-full md:w-[460px] shrink-0 flex flex-col justify-center px-6 md:px-10 py-12 relative">
        <div className="absolute top-6 right-6 md:hidden">
          <Link
            href="/"
            className="text-[12px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]"
          >
            ← Retour
          </Link>
        </div>
        <div className="max-w-[360px] w-full mx-auto">
          <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)] mb-3">
            Accès
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[34px] leading-[1] tracking-[-0.02em]">
            Se connecter
          </h2>
          <p className="mt-2 text-[13px] text-[color:var(--nafas-ink3)]">
            Par e-mail et mot de passe, ou via un lien magique envoyé sur votre adresse
            professionnelle.
          </p>

          {!configured || reason === "unconfigured" ? (
            <div className="mt-5 rounded-md border border-[color:var(--nafas-amber)]/30 bg-[color:var(--nafas-amber)]/10 p-3 text-[12.5px] text-[color:var(--nafas-amber)]">
              Supabase n&apos;est pas configuré. Ajoutez{" "}
              <code className="font-[family-name:var(--font-jetbrains)] text-[11.5px]">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              et{" "}
              <code className="font-[family-name:var(--font-jetbrains)] text-[11.5px]">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              à votre fichier <code>.env.local</code>.
            </div>
          ) : null}

          <div className="mt-7">
            <LoginForm redirectTo={next ?? "/app"} disabled={!configured} />
          </div>

          <div className="mt-8 text-[12px] text-[color:var(--nafas-ink3)]">
            Besoin d&apos;un accès ?{" "}
            <a
              href="mailto:contact@nafas.tn"
              className="text-[color:var(--nafas-accent2)] hover:underline"
            >
              Demander une invitation
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
