"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AppDialog,
  Button,
  Eyebrow,
  FormLabel,
  Input,
  SelectField,
  StatusBadge,
} from "@/components/app/ui/Primitives";
import { RoleGate } from "@/lib/auth/RoleGate";
import { useIsAdmin } from "@/lib/auth/useRole";
import type { Profile } from "@/lib/supabase/types";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  supervisor: "Superviseur",
  user: "Citoyen",
};

export function UsersTab() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [inviteOpen, setInviteOpen] = useState(false);

  const list = useQuery<Profile[]>({
    queryKey: ["profiles"],
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as Profile[]) ?? [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: Profile["role"] }) => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("profiles").update({ role }).eq("user_id", user_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
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
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <Eyebrow>Utilisateurs</Eyebrow>
          <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-[22px] leading-tight">
            Comptes de la municipalité
          </h2>
        </div>
        <Button onClick={() => setInviteOpen(true)}>+ Inviter</Button>
      </div>

      <div className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/40 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-3 py-2.5 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
                Nom
              </th>
              <th className="px-3 py-2.5 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
                Rôle
              </th>
              <th className="px-3 py-2.5 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
                Langue
              </th>
              <th className="px-3 py-2.5 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
                Créé
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-[13px] text-[color:var(--nafas-ink3)]">
                  Chargement…
                </td>
              </tr>
            ) : !list.data?.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-[13px] text-[color:var(--nafas-ink3)]">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              list.data.map((p) => (
                <tr key={p.user_id} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2.5 text-[13px]">{p.full_name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {isAdmin ? (
                      <div className="w-40">
                        <SelectField
                          value={p.role}
                          onValueChange={(v) =>
                            updateRole.mutate({ user_id: p.user_id, role: v as Profile["role"] })
                          }
                          options={[
                            { value: "admin", label: "Administrateur" },
                            { value: "supervisor", label: "Superviseur" },
                            { value: "user", label: "Citoyen" },
                          ]}
                        />
                      </div>
                    ) : (
                      <StatusBadge tone={p.role === "admin" ? "accent" : p.role === "supervisor" ? "blue" : "neutral"}>
                        {ROLE_LABEL[p.role] ?? p.role}
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] font-[family-name:var(--font-jetbrains)] uppercase">
                    {p.preferred_locale ?? "fr"}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-[family-name:var(--font-jetbrains)] tabular-nums text-[color:var(--nafas-ink3)]">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] text-[color:var(--nafas-ink3)]">
                    {p.user_id.slice(0, 6)}…
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </RoleGate>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("supervisor");
  const [status, setStatus] = useState<null | { tone: "ok" | "err"; msg: string }>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      // V2: invitations require the service role key, which we expose through
      // a dedicated server action. For now, show a clear message: the
      // backend agent owns /app/api/parametres/invite. We fire a POST and
      // let the route handler respond.
      const res = await fetch("/api/parametres/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus({ tone: "ok", msg: "Invitation envoyée." });
      setEmail("");
    } catch (e) {
      setStatus({
        tone: "err",
        msg:
          e instanceof Error
            ? `${e.message} · L'endpoint /api/parametres/invite doit être implémenté par l'équipe backend.`
            : "Erreur inconnue",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Inviter un·e collaborateur·rice"
      description="Un lien magique lui sera envoyé. Son rôle sera créé automatiquement à la première connexion."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <FormLabel htmlFor="invite-email">Adresse e-mail</FormLabel>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <FormLabel>Rôle</FormLabel>
          <SelectField
            value={role}
            onValueChange={setRole}
            options={[
              { value: "admin", label: "Administrateur" },
              { value: "supervisor", label: "Superviseur" },
              { value: "user", label: "Citoyen" },
            ]}
          />
        </div>
        {status ? (
          <div
            className={`rounded-md px-3 py-2 text-[12.5px] border ${
              status.tone === "ok"
                ? "border-[color:var(--nafas-accent)]/30 bg-[color:var(--nafas-accent)]/10 text-[color:var(--nafas-accent2)]"
                : "border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 text-[color:var(--nafas-danger)]"
            }`}
          >
            {status.msg}
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Envoi…" : "Envoyer l'invitation"}
          </Button>
        </div>
      </form>
    </AppDialog>
  );
}
