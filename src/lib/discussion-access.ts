import { redirect } from "next/navigation";
import { createClient } from "../utils/supabase/server";
import { resourceOptions } from "./resources";
import { hasActiveAccess } from "./access-policy";

export const discussionTopics = [
  { key: "general", label: "General Research" },
  ...resourceOptions.map(({ key, label }) => ({ key, label })),
];

export async function requireDiscussionAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles")
    .select("role,status,expires_at").eq("id", user.id).single();
  if (error || !hasActiveAccess(profile)) {
    redirect("/login");
  }
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
