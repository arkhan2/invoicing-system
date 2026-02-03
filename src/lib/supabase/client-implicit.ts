import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Browser client with implicit flow for signUp only.
 * Supabase will redirect with #access_token=...&refresh_token=... so the
 * confirmation link works in any browser (no PKCE code verifier needed).
 * Use the regular createClient() from client.ts for everything else.
 */
export function createClientImplicit() {
  const { url, key } = supabaseEnv;
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      detectSessionInUrl: true,
    },
  });
}
