import Link from "next/link";
import { requireSiloAccess } from "../../lib/silo-access";

export default async function SiloPage() {
  const { supabase, user } = await requireSiloAccess();
  const [{ data: projects, error }, { data: canCreate }] = await Promise.all([
    supabase.from("silo_projects").select("id,title,description,status,is_visible,author_id,created_at")
      .order("created_at", { ascending: true }),
    supabase.rpc("can_create_silo"),
  ]);
  return <>
    <div className="healthtwin-library-hero healthtwin-silo-hero flex flex-wrap items-end justify-between gap-5">
      <div><p className="research-section-title">Research artifact</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">SILO — Spectre-in-the-Loop RFIC Design</h1>
        <p className="mt-3 text-slate-300">Variability-aware CAD, simulation evidence and research resources.</p></div>
      {canCreate && <Link href="/silo/new" className="research-btn-primary text-sm">+ Add SILO project</Link>}
    </div>
    {error ? <p role="alert" className="research-panel mt-8 p-6 text-amber-200">
      SILO resources are unavailable. Run scripts/silo-and-reports.sql in Supabase SQL Editor.
    </p> : !projects?.length ? <p className="research-panel mt-8 p-8 text-slate-300">
      No SILO projects published yet. {canCreate ? "Add the first project above." : "Check back soon."}
    </p> : <div className="mt-8 grid gap-5 md:grid-cols-2">{projects.map((project) =>
      <Link key={project.id} href={`/silo/${project.id}`}
        className="research-panel group flex min-h-48 flex-col p-6 transition hover:border-cyan-400/50">
        <span className="text-xs font-bold uppercase text-cyan-300">
          {!project.is_visible ? "Hidden from subscribers" : project.status === "draft" ? project.author_id === user.id ? "Your draft" : "Draft" : "Research project"}</span>
        <h2 className="mt-4 text-xl font-bold group-hover:text-cyan-200">{project.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm text-slate-300">{project.description}</p>
        <span className="mt-auto pt-5 text-sm font-semibold text-cyan-300">Explore project →</span>
      </Link>)}</div>}
  </>;
}
