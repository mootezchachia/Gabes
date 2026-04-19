"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Button,
  FormLabel,
  FormMessage,
  Input,
  SelectField,
} from "@/components/app/ui/Primitives";
import { GABES } from "@/lib/tokens";
import { lngLatToGeoJson } from "@/lib/app/geo";

const schema = z.object({
  full_name: z.string().min(2, "Au moins 2 caractères").max(120),
  preferred_locale: z.enum(["fr", "ar", "en"]).default("fr"),
  home_lng: z.number().min(-180).max(180),
  home_lat: z.number().min(-90).max(90),
  school_lng: z.number().optional().nullable(),
  school_lat: z.number().optional().nullable(),
});

export function WelcomeForm({
  userId,
  email,
  defaultName,
  invitedRole,
  invitedOrgId,
}: {
  userId: string;
  email: string;
  defaultName: string;
  invitedRole: string;
  invitedOrgId: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultName);
  const [locale, setLocale] = useState<"fr" | "ar" | "en">("fr");
  const [home, setHome] = useState<[number, number]>(
    [GABES.aminaHome[0], GABES.aminaHome[1]],
  );
  const [school, setSchool] = useState<[number, number] | null>([
    GABES.schoolChattEssalam[0],
    GABES.schoolChattEssalam[1],
  ]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const parsed = schema.safeParse({
      full_name: fullName,
      preferred_locale: locale,
      home_lng: home[0],
      home_lat: home[1],
      school_lng: school?.[0] ?? null,
      school_lat: school?.[1] ?? null,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    if (!invitedOrgId) {
      setErr(
        "Aucune organisation n'est associée à votre invitation. Contactez un administrateur.",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const insert: Record<string, unknown> = {
        user_id: userId,
        org_id: invitedOrgId,
        role: invitedRole as "admin" | "supervisor" | "user",
        full_name: parsed.data.full_name,
        preferred_locale: parsed.data.preferred_locale,
        home_location: lngLatToGeoJson([parsed.data.home_lng, parsed.data.home_lat]),
        school_location:
          parsed.data.school_lng != null && parsed.data.school_lat != null
            ? lngLatToGeoJson([parsed.data.school_lng, parsed.data.school_lat])
            : null,
      };
      const { error } = await supabase.from("profiles").insert(insert);
      if (error) {
        setErr(error.message);
        return;
      }
      router.push(invitedRole === "user" ? "/dawa" : "/app");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
        Connecté en tant que · {email}
      </div>

      <div>
        <FormLabel htmlFor="full_name">Nom complet</FormLabel>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          required
        />
      </div>

      <div>
        <FormLabel>Langue préférée</FormLabel>
        <SelectField
          value={locale}
          onValueChange={(v) => setLocale(v as "fr" | "ar" | "en")}
          options={[
            { value: "fr", label: "Français" },
            { value: "ar", label: "العربية" },
            { value: "en", label: "English" },
          ]}
        />
      </div>

      <fieldset className="rounded-md border border-white/5 p-3">
        <legend className="px-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
          Domicile (Gabès)
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel htmlFor="home_lng">Longitude</FormLabel>
            <Input
              id="home_lng"
              type="number"
              step="0.000001"
              value={home[0]}
              onChange={(e) => setHome([parseFloat(e.target.value), home[1]])}
            />
          </div>
          <div>
            <FormLabel htmlFor="home_lat">Latitude</FormLabel>
            <Input
              id="home_lat"
              type="number"
              step="0.000001"
              value={home[1]}
              onChange={(e) => setHome([home[0], parseFloat(e.target.value)])}
            />
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-[color:var(--nafas-ink3)]">
          La sélection par carte interactive sera ajoutée ultérieurement. Pour l&apos;instant, les
          coordonnées pré-remplies pointent sur Ghannouch.
        </p>
      </fieldset>

      <fieldset className="rounded-md border border-white/5 p-3">
        <legend className="px-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
          École (optionnel)
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel htmlFor="school_lng">Longitude</FormLabel>
            <Input
              id="school_lng"
              type="number"
              step="0.000001"
              value={school?.[0] ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isNaN(v)) return setSchool(null);
                setSchool([v, school?.[1] ?? GABES.schoolChattEssalam[1]]);
              }}
            />
          </div>
          <div>
            <FormLabel htmlFor="school_lat">Latitude</FormLabel>
            <Input
              id="school_lat"
              type="number"
              step="0.000001"
              value={school?.[1] ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isNaN(v)) return setSchool(null);
                setSchool([school?.[0] ?? GABES.schoolChattEssalam[0], v]);
              }}
            />
          </div>
        </div>
      </fieldset>

      {err ? (
        <div className="rounded-md border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-3 py-2 text-[12.5px] text-[color:var(--nafas-danger)]">
          {err}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Enregistrement…" : "Accéder à HealiX"}
      </Button>
      <FormMessage help="Vous pourrez modifier ces informations à tout moment depuis Paramètres · Moi." />
    </form>
  );
}
