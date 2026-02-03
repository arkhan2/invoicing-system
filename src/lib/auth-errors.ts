/**
 * Map Supabase auth errors to user-friendly messages.
 */

export function getAuthErrorMessage(error: { message: string } | null): string {
  if (!error?.message) return "Something went wrong.";
  const m = error.message.toLowerCase();

  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Invalid email or password. Check and try again, or sign up if you don't have an account.";
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed"))
    return "Please confirm your email first. Check your inbox for the confirmation link from Supabase.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "This email is already registered. Sign in instead, or use a different email to sign up.";
  if (m.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (m.includes("code verifier") || m.includes("code_verifier"))
    return "Open the confirmation link in the same browser where you signed up (copy the link and paste it in that tab). Already confirmed? Sign in below with your email and password.";

  return error.message;
}
