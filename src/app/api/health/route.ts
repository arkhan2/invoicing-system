import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/health — Check Supabase env and connection.
 * Open in browser or: curl http://localhost:3000/api/health
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const { error: dbError } = await supabase.from("companies").select("id").limit(1);

    if (dbError) {
      return NextResponse.json(
        { ok: false, message: "Supabase connected but DB error (run schema?).", error: dbError.message },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connection OK.",
      signedIn: !!session?.user?.email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message },
      { status: 503 }
    );
  }
}
