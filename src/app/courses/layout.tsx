import { requireCourseAccess } from "../../lib/course-access";
import InternalShell from "../../components/InternalShell";

export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  await requireCourseAccess();
  return <InternalShell section="Courses">{children}</InternalShell>;
}