"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppTabs, Button, FormLabel, FormMessage, Input } from "@/components/app/ui/Primitives";

const passwordSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
});

const magicSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
});

export function LoginForm({
  redirectTo,
  disabled = false,
}: {
  redirectTo: string;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState("password");

  return (
    <AppTabs
      value={tab}
      onValueChange={setTab}
      items={[
        {
          value: "password",
          label: "Mot de passe",
          content: <PasswordTab redirectTo={redirectTo} disabled={disabled} />,
        },
        {
          value: "magic",
          label: "Lien magique",
          content: <MagicLinkTab disabled={disabled} />,
        },
      ]}
    />
  );
}

function PasswordTab({ redirectTo, disabled }: { redirectTo: string; disabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = passwordSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        setErrors({ form: humaniseAuthError(error.message) });
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <FormLabel htmlFor="email">Adresse e-mail</FormLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          disabled={disabled || loading}
          placeholder="admin@nafas.tn"
        />
        <FormMessage error={errors.email} />
      </div>
      <div>
        <FormLabel htmlFor="password">Mot de passe</FormLabel>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={errors.password ? true : undefined}
          disabled={disabled || loading}
        />
        <FormMessage error={errors.password} />
      </div>
      {errors.form ? (
        <div className="rounded-md border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-3 py-2 text-[12.5px] text-[color:var(--nafas-danger)]">
          {errors.form}
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={disabled || loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

function MagicLinkTab({ disabled }: { disabled: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; form?: string }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = magicSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message });
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: { emailRedirectTo: `${origin}/app` },
      });
      if (error) {
        setErrors({ form: humaniseAuthError(error.message) });
        return;
      }
      setSent(true);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-[color:var(--nafas-accent)]/30 bg-[color:var(--nafas-accent)]/10 px-4 py-4 text-[13px] text-[color:var(--nafas-accent2)]">
        Lien envoyé. Vérifiez votre boîte de réception à <strong>{email}</strong> et cliquez sur le
        lien pour vous connecter.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <FormLabel htmlFor="magic-email">Adresse e-mail</FormLabel>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          disabled={disabled || loading}
          placeholder="vous@municipalite.gabes.tn"
        />
        <FormMessage
          error={errors.email}
          help="Nous vous envoyons un lien à usage unique, valable 1 h."
        />
      </div>
      {errors.form ? (
        <div className="rounded-md border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-3 py-2 text-[12.5px] text-[color:var(--nafas-danger)]">
          {errors.form}
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={disabled || loading}>
        {loading ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}

function humaniseAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid") && m.includes("credentials"))
    return "Identifiants invalides. Vérifiez votre e-mail et mot de passe.";
  if (m.includes("email not confirmed"))
    return "Adresse non confirmée. Ouvrez le lien que nous vous avons envoyé.";
  if (m.includes("rate")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return msg;
}
