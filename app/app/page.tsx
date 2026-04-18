import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Root of /app — a thin role router.
 *
 * The proxy has already verified auth + profile presence by the time we
 * get here, so we just read the profile and dispatch by role. Admin +
 * supervisor go to the Carte (it's the canonical landing for the shell);
 * `user` gets kicked over to /dawa.
 */
export default async function AppIndexPage() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) redirect("/welcome");

    if (profile.role === "user") redirect("/dawa");
    redirect("/app/carte");
  } catch (e) {
    // Supabase not configured — bail to login which surfaces the banner.
    if (e instanceof Error && e.message.includes("Supabase")) {
      redirect("/login?reason=unconfigured");
    }
    throw e;
  }
}
