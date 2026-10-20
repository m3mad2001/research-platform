import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiloAccess } from "../../../lib/silo-access";
import { SILO_DEFAULT_README, SILO_REPOSITORY_URL } from "../../../lib/silo-default-readme";
import CourseReadme from "../../courses/CourseReadme";
import DownloadCourseFile from "../../courses/DownloadCourseFile";

export default async function SiloProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSiloAccess();
  const { data: project, error } = await supabase.from("silo_projects")
    .select("id,title,description,supplementary_url,readme_markdown,status").eq("id", id).maybeSingle();
  if (error || !project) notFound();
  const [{ data: links }, { data: files }, { data: canEdit }] = await Promise.all([
    supabase.from("silo_links").select("id,title,video_url,position").eq("project_id", id).order("position"),
    supabase.from("silo_files").select("id,file_name,storage_path,size_bytes").eq("project_id", id).order("created_at"),
    supabase.rpc("can_manage_silo", { p_project_id: id }),
  ]);
  const markdown = project.readme_markdown ||
    (project.supplementary_url === SILO_REPOSITORY_URL ? SILO_DEFAULT_README : "");
  return <>
    <Link href="/silo" className="text-sm text-cyan-300">← SILO projects</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
      <div><p className="research-section-title">{project.status === "draft" ? "Draft research project" : "Published research project"}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{project.title}</h1>
        {project.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-slate-300">{project.description}</p>}
        {project.supplementary_url && <a href={project.supplementary_url} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block font-semibold text-cyan-300 hover:underline">Open GitHub / supplementary link ↗</a>}
      </div>
      {canEdit && <Link href={`/silo/${id}/edit`} className="research-btn-secondary text-sm">Edit project</Link>}
    </div>
    {markdown && <section className="research-panel mt-8 p-6 sm:p-8">
      <h2 className="mb-5 border-b border-white/10 pb-4 text-sm font-semibold text-slate-300">README.md</h2>
      <CourseReadme markdown={markdown} repositoryUrl={project.supplementary_url} />
    </section>}
    {links?.length ? <section className="research-panel mt-6 p-6">
      <h2 className="text-xl font-bold">Video &amp; research links</h2>
      <ol className="mt-5 space-y-3">{links.map((link, index) => <li key={link.id}
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-400/15 bg-slate-950/40 p-4">
        <span className="font-medium"><span className="mr-3 text-cyan-300">{String(index + 1).padStart(2,"0")}</span>{link.title}</span>
        <a href={link.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-cyan-300 hover:underline">Open link ↗</a>
      </li>)}</ol>
    </section> : null}
    {files?.length ? <section className="research-panel mt-6 p-6">
      <h2 className="text-xl font-bold">Research data and files</h2>
      <div className="mt-5 space-y-3">{files.map((file) =>
        <DownloadCourseFile key={file.id} fileName={file.file_name} storagePath={file.storage_path}
          sizeBytes={file.size_bytes} storageBucket="silo-materials" />)}</div>
    </section> : null}
  </>;
}
