import { createServerClient } from "@supabase/ssr";
import type { AuthError, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv, SUPABASE_AUTH_COOKIE_NAME } from "./env";

/** Return type for getUserSafe: data.user may be null when we swallowed refresh_token_not_found. */
type GetUserSafeResponse = { data: { user: User | null }; error: AuthError | null };

/**
 * Same as supabase.auth.getUser() but returns null user on refresh_token_not_found
 * instead of throwing (e.g. when the link was opened in a different browser).
 */
export async function getUserSafe(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<GetUserSafeResponse> {
  try {
    const result = await supabase.auth.getUser();
    return result as GetUserSafeResponse;
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : undefined;
    if (code === "refresh_token_not_found") {
      return { data: { user: null }, error: null };
    }
    throw e;
  }
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv;

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components
          }
        },
      },
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
    }
  );
}
