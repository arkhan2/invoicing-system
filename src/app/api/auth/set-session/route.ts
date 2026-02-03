import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/set-session
 * Sets the auth session from access_token + refresh_token (e.g. from implicit flow hash).
 * Response includes Set-Cookie so the user is logged in in this browser.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const access_token = body.access_token as string | undefined;
    const refresh_token = body.refresh_token as string | undefined;

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "access_token and refresh_token required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url), {
      status: 302,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
