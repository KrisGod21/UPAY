import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses every RLS policy, so it must never be imported
 * into a Client Component or any code that reaches the browser. Used by the
 * seed script and by server-side jobs that legitimately act on the whole org.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
