import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Handles the redirect from Supabase after email confirmation (or OAuth).
 * Exchanges the `code` for a session and redirects to /dashboard.
 * If the link expired or failed, redirects to /login with an error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  if (error) {
    const message =
      errorCode === "otp_expired"
        ? "Confirmation link expired. Please sign up again or request a new link."
        : errorDescription ?? "Could not confirm your email.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Missing+confirmation+code", request.url)
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    let message = exchangeError.message;
    if (exchangeError.message.includes("code verifier") || exchangeError.message.includes("code_verifier")) {
      message =
        "Open this link in the same browser where you signed up (e.g. copy the link and paste it in that tab). Already confirmed? Sign in below with your email and password.";
    } else if (exchangeError.message === "Email link is invalid or has expired") {
      message =
        "Confirmation link expired. Please sign up again or use the latest link from your email.";
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
