import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSiloAccess } from "../../../../lib/silo-access";
import SiloEditor from "../../SiloEditor";

export default async function EditSiloProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSiloAccess();
  const { data: canEdit } = await supabase.rpc("can_manage_silo", { p_project_id: id });
  if (!canEdit) redirect("/silo");
  const { data: project } = await supabase.from("silo_projects")
    .select("id,title,description,supplementary_url,readme_markdown,status,is_visible").eq("id", id).maybeSingle();
  if (!project) notFound();
  const [{ data: links }, { data: files }] = await Promise.all([
    supabase.from("silo_links").select("id,title,video_url,position").eq("project_id", id).order("position"),
    supabase.from("silo_files").select("id,file_name,storage_path,size_bytes").eq("project_id", id).order("created_at"),
  ]);
  return <><Link href={`/silo/${id}`} className="text-sm text-cyan-300">← Back to project</Link>
    <h1 className="mt-5 text-3xl font-bold">Edit SILO project</h1>
    <SiloEditor initialProject={project} initialLinks={links ?? []} initialFiles={files ?? []} />
  </>;
}
