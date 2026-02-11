import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv, SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/env";
import { isConnectionError } from "@/lib/supabase/connection-error";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const { url, key } = supabaseEnv;
  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : undefined;
    if (code === "refresh_token_not_found" || isConnectionError(e)) {
      response.cookies.set(SUPABASE_AUTH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    }
    // Continue: layout will show ConnectionUnavailable or redirect to login
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
