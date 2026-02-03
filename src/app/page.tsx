import { redirect } from "next/navigation";
import { createClient, getUserSafe } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUserSafe(supabase);

  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
