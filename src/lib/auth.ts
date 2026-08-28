import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

/**
 * The signed-in user's profile, or a redirect to the login page.
 *
 * Wrapped in React's cache() because the layout and the page both need it, and
 * without memoisation every page paid for two auth round-trips and two profile
 * lookups instead of one. The cache is per-request, so it never leaks a profile
 * between users.
 */
export const requireProfile = cache(async function requireProfile(): Promise<{
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    // Authenticated but no profile row — the account was created outside the
    // signup trigger. Sign out rather than rendering a half-broken shell.
    await supabase.auth.signOut();
    redirect("/login?error=no-profile");
  }

  return { profile, supabase };
});

export async function requireRole(roles: UserRole[]) {
  const ctx = await requireProfile();
  if (!roles.includes(ctx.profile.role)) redirect("/dashboard");
  return ctx;
}

/** Centre ids this profile is allowed to act on. `null` means "all of them". */
export async function scopedCenterIds(
  profile: Profile,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[] | null> {
  if (profile.role === "admin") return null;
  if (profile.role === "coordinator" && profile.zone_id) {
    const { data } = await supabase.from("centers").select("id").eq("zone_id", profile.zone_id);
    return (data ?? []).map((c) => c.id as string);
  }
  return profile.center_id ? [profile.center_id] : [];
}
