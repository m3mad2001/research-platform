import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCourseAccess } from "../../../lib/course-access";
import CourseEditor from "../CourseEditor";

export default async function NewCoursePage() {
  const { supabase } = await requireCourseAccess();
  const { data: canCreate } = await supabase.rpc("can_create_courses");
  if (!canCreate) redirect("/courses");

  return <>
    <Link href="/courses" className="text-sm text-cyan-300">← All courses</Link>
    <h1 className="mt-5 text-3xl font-bold">Create a Course</h1>
    <p className="mt-2 text-slate-300">Only a course name is required. README.md, lessons, a supplementary link, and PDF or ZIP files are optional.</p>
    <CourseEditor />
  </>;
}
