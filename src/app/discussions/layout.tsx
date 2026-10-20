import Link from "next/link";
import { BrandLockup } from "../../components/HealthTwinBrand";
import { requireDiscussionAccess } from "../../lib/discussion-access";

export default async function DiscussionsLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await requireDiscussionAccess();
  return <main className="research-shell min-h-screen bg-[#061726] text-white">
    <header className="healthtwin-internal-header border-b border-cyan-400/15">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div><BrandLockup compact /><p className="mt-1 text-xs font-semibold tracking-[0.2em] text-cyan-300">RESEARCH DISCUSSIONS</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/discussions" className="research-btn-secondary text-sm">Discussions</Link>
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="research-btn-secondary text-sm">← Dashboard</Link></div>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-9 sm:px-6">{children}</div>
  </main>;
}
