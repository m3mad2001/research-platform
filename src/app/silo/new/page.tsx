import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSiloAccess } from "../../../lib/silo-access";
import SiloEditor from "../SiloEditor";

export default async function NewSiloProjectPage() {
  const { supabase } = await requireSiloAccess();
  const { data: canCreate } = await supabase.rpc("can_create_silo");
  if (!canCreate) redirect("/silo");
  return <><Link href="/silo" className="text-sm text-cyan-300">← SILO projects</Link>
    <h1 className="mt-5 text-3xl font-bold">Add a SILO project</h1>
    <p className="mt-2 text-slate-300">Only the name is required. GitHub link, README, videos and PDF/ZIP data are optional.</p>
    <SiloEditor />
  </>;
}
