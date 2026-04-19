"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Button,
  Eyebrow,
  FormLabel,
  FormMessage,
  Input,
  SelectField,
} from "@/components/app/ui/Primitives";
import { useProfile } from "@/lib/auth/useProfile";
import { lngLatToGeoJson, pointToLngLat } from "@/lib/app/geo";

export function MoiTab() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [locale, setLocale] = useState<"fr" | "ar" | "en">("fr");
  const [home, setHome] = useState<[number, number] | null>(null);
  const [school, setSchool] = useState<[number, number] | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = profile?.profile;
    if (p) {
      setFullName(p.full_name ?? "");
      setLocale((p.preferred_locale as "fr" | "ar" | "en") ?? "fr");
      setHome(pointToLngLat(p.home_location));
      setSchool(pointToLngLat(p.school_location));
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      setErr(null);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          preferred_locale: locale,
          home_location: home ? lngLatToGeoJson(home) : null,
          school_location: school ? lngLatToGeoJson(school) : null,
        })
        .eq("user_id", profile!.userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (!profile?.profile) {
    return (
      <div className="text-[13px] text-[color:var(--nafas-ink3)]">Chargement du profil…</div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Moi</Eyebrow>
        <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-[22px] leading-tight">
          Mon profil
        </h2>
        <p className="mt-2 text-[13px] text-[color:var(--nafas-ink3)] max-w-[60ch]">
          Ces informations pilotent vos alertes personnelles et le calcul du trajet le plus sain
          dans l&apos;application citoyenne /dawa.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-5 max-w-[640px]"
      >
        <div>
          <FormLabel htmlFor="me-name">Nom complet</FormLabel>
          <Input id="me-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
            Domicile
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel htmlFor="home-lng">Longitude</FormLabel>
              <Input
                id="home-lng"
                type="number"
                step="0.000001"
                value={home?.[0] ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setHome(Number.isNaN(v) ? null : [v, home?.[1] ?? 0]);
                }}
              />
            </div>
            <div>
              <FormLabel htmlFor="home-lat">Latitude</FormLabel>
              <Input
                id="home-lat"
                type="number"
                step="0.000001"
                value={home?.[1] ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setHome(Number.isNaN(v) ? null : [home?.[0] ?? 0, v]);
                }}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-white/5 p-3">
          <legend className="px-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
            École (optionnel)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel htmlFor="school-lng">Longitude</FormLabel>
              <Input
                id="school-lng"
                type="number"
                step="0.000001"
                value={school?.[0] ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setSchool(Number.isNaN(v) ? null : [v, school?.[1] ?? 0]);
                }}
              />
            </div>
            <div>
              <FormLabel htmlFor="school-lat">Latitude</FormLabel>
              <Input
                id="school-lat"
                type="number"
                step="0.000001"
                value={school?.[1] ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setSchool(Number.isNaN(v) ? null : [school?.[0] ?? 0, v]);
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
        {saved ? (
          <div className="rounded-md border border-[color:var(--nafas-accent)]/30 bg-[color:var(--nafas-accent)]/10 px-3 py-2 text-[12.5px] text-[color:var(--nafas-accent2)]">
            Enregistré.
          </div>
        ) : null}

        <div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <FormMessage help="Un picker cartographique remplacera les coordonnées brutes en V2.1." />
        </div>
      </form>
    </>
  );
}
