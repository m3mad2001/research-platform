import Link from "next/link";
import { requireCourseAccess } from "../../lib/course-access";

export default async function CoursesPage() {
  const { supabase, user } = await requireCourseAccess();
  const [{ data: courses, error }, { data: canCreate }] = await Promise.all([
    supabase.from("courses").select("id, title, description, status, is_visible, author_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("can_create_courses"),
  ]);

  return (
    <>
      <div className="healthtwin-library-hero healthtwin-courses-hero flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="research-section-title">Learning Library</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Engineering Courses</h1>
          <p className="mt-3 text-slate-300">Video lessons and protected course materials in one place.</p>
        </div>
        {canCreate && <Link href="/courses/new" className="research-btn-primary text-sm">+ Create Course</Link>}
      </div>

      {error ? <p role="alert" className="mt-8 rounded-xl border border-red-400/30 p-5 text-red-200">
        Courses are unavailable. Check that scripts/courses-and-silo.sql has been run in Supabase.
      </p> : !courses?.length ? <div className="research-panel mt-8 p-8 text-slate-300">
        No published courses yet. {canCreate ? "Create the first course using the button above." : "Check back soon."}
      </div> : <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => <Link href={`/courses/${course.id}`} key={course.id}
          className="research-panel group flex min-h-52 flex-col p-6 transition hover:border-cyan-400/50">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            {!course.is_visible ? "Hidden from subscribers" : course.status === "draft" ? course.author_id === user.id ? "Your Draft" : "Draft" : "Published Course"}
          </span>
          <h2 className="mt-4 text-xl font-bold group-hover:text-cyan-200">{course.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm text-slate-300">{course.description || "Explore lessons and learning materials."}</p>
          <span className="mt-auto pt-5 text-sm font-semibold text-cyan-300">Open course →</span>
        </Link>)}
      </div>}
    </>
  );
}
