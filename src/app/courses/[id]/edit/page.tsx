import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireCourseAccess } from "../../../../lib/course-access";
import CourseEditor from "../../CourseEditor";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireCourseAccess();
  const { data: canEdit } = await supabase.rpc("can_manage_course", { target_course_id: id });
  if (!canEdit) redirect("/courses");

  const { data: course } = await supabase.from("courses")
    .select("id,title,description,supplementary_url,readme_markdown,status,is_visible").eq("id", id).maybeSingle();
  if (!course) notFound();
  const [{ data: lessons }, { data: files }] = await Promise.all([
    supabase.from("course_lessons").select("id,title,video_url,position").eq("course_id", id).order("position"),
    supabase.from("course_files").select("id,file_name,storage_path,size_bytes").eq("course_id", id).order("created_at"),
  ]);

  return <>
    <Link href={`/courses/${id}`} className="text-sm text-cyan-300">← Back to course</Link>
    <h1 className="mt-5 text-3xl font-bold">Edit Course</h1>
    <CourseEditor initialCourse={course} initialLessons={lessons ?? []} initialFiles={files ?? []} />
  </>;
}
