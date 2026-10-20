import Link from "next/link";
import { requireCourseAccess } from "../../lib/course-access";
import { BrandLockup } from "../../components/HealthTwinBrand";

export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  await requireCourseAccess();

  return (
    <main className="research-shell min-h-screen bg-[#061122] text-white">
      <header className="healthtwin-internal-header border-b border-cyan-400/15 bg-[#020817]/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div><BrandLockup compact /><p className="mt-1 text-xs font-semibold tracking-[0.2em] text-cyan-300">COURSES</p></div>
          <Link href="/dashboard" className="research-btn-secondary text-sm">← Platform Dashboard</Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </main>
  );
}
