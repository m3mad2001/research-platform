import { redirect } from "next/navigation";
import { createClient } from "../utils/supabase/server";

export async function requireSiloAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: allowed, error } = await supabase.rpc("can_access_silo");
  // A missing/failed RPC is a deployment setup problem, not an access denial.
  // Surface it on the dashboard instead of silently returning the user there.
  if (error) redirect("/dashboard?notice=silo-setup-required");
  if (!allowed) redirect("/dashboard?notice=silo-access-required");
  return { supabase, user };
}
