"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Eyebrow, ToggleField } from "@/components/app/ui/Primitives";
import { RoleGate } from "@/lib/auth/RoleGate";
import type { Layer, UserRole } from "@/lib/supabase/types";

const ROLES: UserRole[] = ["admin", "supervisor", "user"];
const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  supervisor: "Superviseur",
  user: "Citoyen",
};

export function LayersTab() {
  const qc = useQueryClient();

  const list = useQuery<Layer[]>({
    queryKey: ["layers"],
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("layers")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Layer[]) ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ layer, role, visible }: { layer: Layer; role: UserRole; visible: boolean }) => {
      const next = { ...(layer.visible_for ?? {}), [role]: visible };
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("layers").update({ visible_for: next }).eq("id", layer.id);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ layer, role, visible }) => {
      await qc.cancelQueries({ queryKey: ["layers"] });
      const prev = qc.getQueryData<Layer[]>(["layers"]);
      qc.setQueryData<Layer[]>(["layers"], (old) =>
        (old ?? []).map((l) =>
          l.id === layer.id
            ? { ...l, visible_for: { ...(l.visible_for ?? {}), [role]: visible } as Record<UserRole, boolean> }
            : l,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["layers"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["layers"] }),
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
      <div className="mb-4">
        <Eyebrow>Couches</Eyebrow>
        <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-[22px] leading-tight">
          Visibilité des couches par rôle
        </h2>
        <p className="mt-2 text-[13px] text-[color:var(--nafas-ink3)] max-w-[60ch]">
          Contrôle quelles couches apparaissent sur la carte pour chaque rôle. Les modifications
          s&apos;appliquent immédiatement à tous les utilisateurs de l&apos;organisation.
        </p>
      </div>

      <div className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-3 py-2.5 text-left text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
                Couche
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  className="px-3 py-2.5 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] text-center w-[120px]"
                >
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-[13px] text-[color:var(--nafas-ink3)]">
                  Chargement…
                </td>
              </tr>
            ) : !list.data?.length ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-[13px] text-[color:var(--nafas-ink3)]">
                  Aucune couche définie. Les couches par défaut sont créées par les migrations Supabase.
                </td>
              </tr>
            ) : (
              list.data.map((layer) => (
                <tr key={layer.id} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2.5">
                    <div className="text-[13px]">{layer.label}</div>
                    <div className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                      {layer.key}
                    </div>
                  </td>
                  {ROLES.map((r) => {
                    const visible = Boolean(layer.visible_for?.[r]);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <div className="inline-block">
                          <ToggleField
                            checked={visible}
                            onCheckedChange={(v) => toggle.mutate({ layer, role: r, visible: v })}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
