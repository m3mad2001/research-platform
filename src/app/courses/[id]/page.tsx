import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCourseAccess } from "../../../lib/course-access";
import DownloadCourseFile from "../DownloadCourseFile";
import CourseReadme from "../CourseReadme";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireCourseAccess();
  const { data: course, error } = await supabase.from("courses")
    .select("id,title,description,supplementary_url,readme_markdown,status").eq("id", id).maybeSingle();
  if (error || !course) notFound();

  const [{ data: lessons }, { data: files }, { data: canEdit }] = await Promise.all([
    supabase.from("course_lessons").select("id,title,video_url,position").eq("course_id", id).order("position"),
    supabase.from("course_files").select("id,file_name,storage_path,size_bytes").eq("course_id", id).order("created_at"),
    supabase.rpc("can_manage_course", { target_course_id: id }),
  ]);

  return <>
    <Link href="/courses" className="text-sm text-cyan-300">← All courses</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
      <div>
        <p className="research-section-title">{course.status === "draft" ? "Draft Course" : "Published Course"}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{course.title}</h1>
        {course.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-slate-300">{course.description}</p>}
        {course.supplementary_url && <a href={course.supplementary_url} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-cyan-300 hover:underline">Open supplementary link ↗</a>}
      </div>
      {canEdit && <Link href={`/courses/${id}/edit`} className="research-btn-secondary text-sm">Edit course</Link>}
    </div>

    {course.readme_markdown && <section className="research-panel mt-8 p-6 sm:p-8">
      <h2 className="mb-5 border-b border-white/10 pb-4 text-sm font-semibold text-slate-300">README.md</h2>
      <CourseReadme markdown={course.readme_markdown} repositoryUrl={course.supplementary_url} />
    </section>}

    <section className="research-panel mt-8 p-6">
      <h2 className="text-xl font-bold">Video Lessons</h2>
      {!lessons?.length ? <p className="mt-5 text-slate-400">No lessons added yet.</p> :
        <ol className="mt-5 space-y-3">{lessons.map((lesson, index) =>
          <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-400/15 bg-slate-950/40 p-4">
            <span className="font-medium"><span className="mr-3 text-cyan-300">{String(index + 1).padStart(2,"0")}</span>{lesson.title}</span>
            <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-cyan-300 hover:underline">Watch video ↗</a>
          </li>)}</ol>}
    </section>

    <section className="research-panel mt-5 p-6">
      <h2 className="text-xl font-bold">Course Files</h2>
      {!files?.length ? <p className="mt-5 text-slate-400">No PDFs or ZIP files added yet.</p> :
        <div className="mt-5 space-y-3">{files.map((file) =>
          <DownloadCourseFile key={file.id} fileName={file.file_name} storagePath={file.storage_path} sizeBytes={file.size_bytes} />
        )}</div>}
    </section>
  </>;
}
