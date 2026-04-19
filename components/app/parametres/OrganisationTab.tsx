"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Button,
  Eyebrow,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@/components/app/ui/Primitives";
import { RoleGate } from "@/lib/auth/RoleGate";
import { useProfile } from "@/lib/auth/useProfile";
import type { Org } from "@/lib/supabase/types";

export function OrganisationTab() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();

  const org = useQuery<Org | null>({
    queryKey: ["org", profile?.orgId],
    enabled: Boolean(profile?.orgId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!profile?.orgId) return null;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("orgs").select("*").eq("id", profile.orgId).maybeSingle();
      return (data as Org | null) ?? null;
    },
  });

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1D9E75");
  const [weightsStr, setWeightsStr] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (org.data) {
      setName(org.data.name);
      setPrimaryColor(org.data.primary_color ?? "#1D9E75");
      setWeightsStr(JSON.stringify(org.data.ai_weights ?? {}, null, 2));
    }
  }, [org.data]);

  const save = useMutation({
    mutationFn: async () => {
      setErr(null);
      let weights: Record<string, number> | null = null;
      if (weightsStr.trim()) {
        try {
          weights = JSON.parse(weightsStr);
        } catch {
          throw new Error("Poids IA : JSON invalide.");
        }
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("orgs")
        .update({ name, primary_color: primaryColor, ai_weights: weights ?? undefined })
        .eq("id", profile!.orgId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["org"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <RoleGate
      allow={["admin"]}
      fallback={
        <div className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/40 py-12 px-6 text-center text-[13px] text-[color:var(--nafas-ink3)]">
          Accès réservé aux administrateurs.
        </div>
      }
    >
      <div className="mb-6">
        <Eyebrow>Organisation</Eyebrow>
        <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-[22px] leading-tight">
          Identité et paramètres globaux
        </h2>
      </div>

      {org.isLoading ? (
        <div className="text-[13px] text-[color:var(--nafas-ink3)]">Chargement…</div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-5 max-w-[640px]"
        >
          <div>
            <FormLabel htmlFor="org-name">Nom</FormLabel>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <FormLabel htmlFor="org-color">Couleur principale</FormLabel>
            <div className="flex items-center gap-2">
              <Input
                id="org-color"
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="max-w-[160px] font-[family-name:var(--font-jetbrains)]"
              />
              <div
                aria-hidden
                className="size-9 rounded-md border border-white/10"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
            <FormMessage help="Hex, ex. #1D9E75. Appliquée à la marque et aux accents." />
          </div>
          <div>
            <FormLabel htmlFor="weights">Poids IA (JSON)</FormLabel>
            <Textarea
              id="weights"
              value={weightsStr}
              onChange={(e) => setWeightsStr(e.target.value)}
              className="font-[family-name:var(--font-jetbrains)] text-[12px] min-h-[140px]"
            />
            <FormMessage help="Coefficients w1…w6 du scorer ORACLE. Voir §6 du design." />
          </div>

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
          </div>
        </form>
      )}
    </RoleGate>
  );
}
