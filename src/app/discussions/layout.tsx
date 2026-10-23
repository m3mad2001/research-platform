import Link from "next/link";
import { requireDiscussionAccess } from "../../lib/discussion-access";
import InternalShell from "../../components/InternalShell";

export default async function DiscussionsLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await requireDiscussionAccess();
  return (
    <InternalShell
      section="Research Discussions"
      backHref={isAdmin ? "/admin" : "/dashboard"}
      extra={<Link href="/discussions" className="ax-btn ax-btn-secondary ax-btn-sm">Discussions</Link>}
    >
      {children}
    </InternalShell>
  );
}