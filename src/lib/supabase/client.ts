import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv, SUPABASE_AUTH_COOKIE_NAME } from "./env";

export function createClient() {
  const { url, key } = supabaseEnv;
  return createBrowserClient(url, key, {
    cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
  });
}
