import { redirect } from "next/navigation";
import { createClient } from "../utils/supabase/server";

export async function requireCourseAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: allowed, error } = await supabase.rpc("can_access_courses");
  if (error || !allowed) redirect("/dashboard");
  return { supabase, user };
}
