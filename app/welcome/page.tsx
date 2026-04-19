import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WelcomeForm } from "./WelcomeForm";

export const metadata: Metadata = {
  title: "Bienvenue · NAFAS",
};

export default async function WelcomePage() {
  let user = null;
  let existingProfile = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    user = auth.user;
    if (!user) redirect("/login");
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    existingProfile = data;
  } catch {
    redirect("/login?reason=unconfigured");
  }

  // Already has a profile → route by role.
  if (existingProfile) {
    const role = existingProfile.role;
    redirect(role === "user" ? "/dawa" : "/app");
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const invitedRole =
    (meta.invited_role as string | undefined) ?? (appMeta.invited_role as string | undefined) ?? "user";
  const invitedOrgId =
    (meta.invited_org_id as string | undefined) ??
    (appMeta.invited_org_id as string | undefined) ??
    null;
  const defaultName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-[520px]">
        <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]">
          Bienvenue
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[40px] leading-[1] tracking-[-0.02em]">
          Dites-nous qui vous êtes.
        </h1>
        <p className="mt-4 text-[14px] text-[color:var(--nafas-ink3)]">
          Ces informations servent à personnaliser vos alertes et à vérifier votre rôle au sein de
          la Municipalité de Gabès. Elles ne sont visibles que par les administrateurs de votre
          organisation.
        </p>

        <div className="mt-8 rounded-xl border border-white/5 bg-[color:var(--nafas-bg2)]/60 p-5">
          <WelcomeForm
            userId={user!.id}
            email={user!.email ?? ""}
            defaultName={defaultName}
            invitedRole={invitedRole}
            invitedOrgId={invitedOrgId}
          />
        </div>
      </div>
    </main>
  );
}
