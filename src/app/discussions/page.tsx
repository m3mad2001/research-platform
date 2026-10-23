import Link from "next/link";
import { discussionTopics, requireDiscussionAccess } from "../../lib/discussion-access";

export default async function DiscussionsPage({ searchParams }: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { supabase, user, isAdmin } = await requireDiscussionAccess();
  const { data: grants } = isAdmin ? { data: [] } : await supabase.from("user_resource_access")
    .select("resource_key").eq("user_id", user.id);
  const allowedTopics = isAdmin ? discussionTopics : discussionTopics.filter((entry) =>
    entry.key === "general" || (grants ?? []).some((grant) => grant.resource_key === entry.key));
  const topic = (await searchParams).topic ?? "all";
  const active = allowedTopics.some((entry) => entry.key === topic) ? topic : "all";
  let query = supabase.from("discussion_threads")
    .select("id,title,body,status,resource_key,author_name,created_at,solution_reply_id")
    .order("created_at", { ascending: false }).limit(60);
  if (active !== "all") query = query.eq("resource_key", active);
  const { data: threads, error } = await query;

  return <>
    <div className="flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-cyan-400/20 bg-[var(--card)] p-7 sm:p-10">
      <div><p className="research-section-title">People · ideas · answers</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Research Discussions</h1>
        <p className="mt-3 max-w-2xl text-slate-200">Ask a research question, follow the conversation, and learn from the Engineering Nexus community.</p>
      </div>
      <Link href="/discussions/new" className="research-btn-primary">+ Ask a Question</Link>
    </div>
    <nav aria-label="Discussion topics" className="mt-7 flex flex-wrap gap-2">
      <Link href="/discussions" className={`rounded-full border px-4 py-2 text-sm ${active === "all" ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-slate-300"}`}>All</Link>
      {allowedTopics.map((entry) => <Link key={entry.key} href={`/discussions?topic=${entry.key}`}
        className={`rounded-full border px-4 py-2 text-sm ${active === entry.key ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-slate-300"}`}>{entry.label}</Link>)}
    </nav>
    {error ? <p role="alert" className="research-panel mt-7 p-6 text-amber-200">Discussions are not available yet. An administrator needs to run scripts/research-discussions.sql in Supabase.</p>
      : !threads?.length ? <div className="research-panel mt-7 p-9 text-slate-300">No discussions here yet. Start one with “Ask a Question”.</div>
      : <div className="mt-7 grid gap-4 md:grid-cols-2">{threads.map((thread) =>
        <Link key={thread.id} href={`/discussions/${thread.id}`} className="research-panel group flex min-h-48 flex-col p-6 transition hover:border-cyan-400/50">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{discussionTopics.find((item) => item.key === thread.resource_key)?.label ?? "Research"}</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-200">{thread.status}</span></div>
          <h2 className="mt-3 text-xl font-bold group-hover:text-cyan-200">{thread.title}</h2>
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-slate-300">{thread.body}</p>
          <p className="mt-auto pt-5 text-xs text-slate-400">{thread.author_name} · {new Date(thread.created_at).toLocaleDateString("en-US")}</p>
        </Link>)}</div>}
  </>;
}
