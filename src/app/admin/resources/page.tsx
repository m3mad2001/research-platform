import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "../../../components/HealthTwinBrand";
import { createClient } from "../../../utils/supabase/server";
import { defaultResourceVisibility, type ResourceKey, type ResourceVisibilityMode } from "../../../lib/resources";
import ResourceVisibilityEditor from "./ResourceVisibilityEditor";

export default async function AdminResourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.status !== "approved") redirect("/");
  const { data, error } = await supabase.from("resource_visibility").select("resource_key,display_mode");
  const modes = { ...defaultResourceVisibility };
  for (const row of data ?? []) modes[row.resource_key as ResourceKey] = row.display_mode as ResourceVisibilityMode;

  return <main className="research-shell min-h-screen px-6 py-10 text-white">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4"><BrandLockup />
        <Link href="/admin" className="research-btn-secondary text-sm">← Back to Admin</Link></header>
      <section className="healthtwin-library-hero mt-8 rounded-3xl p-8">
        <p className="research-section-title">Resource Control</p><h1 className="mt-3 text-4xl font-bold">Cards &amp; content visibility</h1>
        <p className="mt-3 max-w-3xl text-slate-300">Control what subscribers can discover without changing individual access grants. Course and SILO authors can also hide individual published items from their editors.</p>
      </section>
      {error ? <p role="alert" className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">Run <code>scripts/communications-and-visibility.sql</code> in Supabase before using this editor.</p>
        : <ResourceVisibilityEditor initialModes={modes} />}
    </div>
  </main>;
}
