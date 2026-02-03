/**
 * Map Supabase auth errors to user-friendly messages.
 */

export function getAuthErrorMessage(error: { message?: string; status?: number } | null): string {
  if (!error) return "Something went wrong.";
  const status = "status" in error ? error.status : undefined;
  const msg = error.message ?? "";
  const m = msg.toLowerCase();

  if (status === 504 || m.includes("504") || m.includes("gateway timeout") || m.includes("timeout"))
    return "The request timed out. This often happens when email (SMTP) is slow or unreachable. Try again in a moment, or check your custom SMTP settings in Supabase (Authentication → SMTP).";
  if (status === 500 || m.includes("500") || m.includes("internal server error"))
    return "Something went wrong on the server while sending the email. Check your custom SMTP settings in Supabase (Authentication → SMTP): host, port, username, password, and sender address. If using default Supabase email, check the project status page.";
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Invalid email or password. Check and try again, or sign up if you don't have an account.";
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed"))
    return "Please confirm your email first. Check your inbox for the confirmation link from Supabase.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "This email is already registered. Sign in instead, or use a different email to sign up.";
  if (
    m.includes("rate limit") ||
    m.includes("email rate limit") ||
    m.includes("too many attempts") ||
    m.includes("too many requests")
  )
    return "Too many attempts. Please wait a few minutes before requesting another code.";
  if (m.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (m.includes("code verifier") || m.includes("code_verifier"))
    return "Open the confirmation link in the same browser where you signed up (copy the link and paste it in that tab). Already confirmed? Sign in below with your email and password.";
  if (m.includes("token") && (m.includes("expired") || m.includes("invalid")))
    return "That code is invalid or has expired. Request a new code and try again.";

  return msg || "Something went wrong.";
}
