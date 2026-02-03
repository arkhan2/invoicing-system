/**
 * Supabase env validation. Ensures URL and anon key are set and not placeholders.
 * Next.js only reads .env.local (and .env) — not .env.local.example.
 */

const PLACEHOLDER_URL = "https://your-project.supabase.co";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (from Supabase Dashboard → Project Settings → API). Restart the dev server after changing .env.local."
    );
  }

  if (url === PLACEHOLDER_URL || url.includes("your-project")) {
    throw new Error(
      "Supabase URL is still the placeholder. Edit .env.local and set NEXT_PUBLIC_SUPABASE_URL to your real project URL (e.g. https://xxxxx.supabase.co). Restart the dev server (npm run dev)."
    );
  }

  if (key === "your-anon-key" || key.length < 50) {
    throw new Error(
      "Supabase anon key is missing or invalid. Edit .env.local and set NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase Dashboard → Project Settings → API. Restart the dev server."
    );
  }

  return { url, key };
}

export const supabaseEnv = getSupabaseEnv();
