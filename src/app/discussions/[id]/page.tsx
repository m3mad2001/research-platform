import Link from "next/link";
import { notFound } from "next/navigation";
import { discussionTopics, isUuid, requireDiscussionAccess } from "../../../lib/discussion-access";
import { postReply, setDiscussionState } from "../actions";

export default async function DiscussionThreadPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, user, isAdmin } = await requireDiscussionAccess();
  const { error: formError } = await searchParams;
  const { data: thread, error: threadError } = await supabase.from("discussion_threads")
    .select("id,title,body,status,resource_key,author_id,author_name,created_at,solution_reply_id")
    .eq("id", id).maybeSingle();
  if (threadError) return <p role="alert" className="research-panel p-6 text-amber-200">Discussion data is unavailable. Ask an administrator to run scripts/research-discussions.sql in Supabase.</p>;
  if (!thread) notFound();
  const [{ data: replies, error: repliesError }, { data: canReply }] = await Promise.all([
    supabase.from("discussion_replies").select("id,body,author_id,author_name,created_at")
      .eq("thread_id", id).order("created_at", { ascending: true }),
    supabase.rpc("can_reply_discussion", { p_thread_id: id }),
  ]);
  const canManage = isAdmin || thread.author_id === user.id;
  const replyAction = postReply.bind(null, id);
  const stateAction = setDiscussionState.bind(null, id);
  return <div className="mx-auto max-w-4xl">
    <Link href="/discussions" className="text-sm text-cyan-300">← All discussions</Link>
    <article className="research-panel mt-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
        <span>{discussionTopics.find((topic) => topic.key === thread.resource_key)?.label ?? "Research"}</span>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-slate-100">{thread.status}</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold">{thread.title}</h1>
      <p className="mt-3 text-sm text-slate-400">Asked by {thread.author_name} · {new Date(thread.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
      <p className="mt-6 whitespace-pre-wrap break-words leading-8 text-slate-200">{thread.body}</p>
      {canManage && <div className="mt-7 flex flex-wrap gap-3 border-t border-white/10 pt-5">
        {thread.status !== "closed" ? <form action={stateAction}>
          <input type="hidden" name="status" value="closed" />
          {thread.solution_reply_id && <input type="hidden" name="solution_reply_id" value={thread.solution_reply_id} />}
          <button type="submit" className="research-btn-secondary text-sm">Close discussion</button>
        </form> : <form action={stateAction}>
          <input type="hidden" name="status" value="open" />
          <button type="submit" className="research-btn-secondary text-sm">Reopen discussion</button>
        </form>}
      </div>}
    </article>

    {formError && <p role="alert" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
      {formError === "invalid" ? "Check the reply length or the selected action." : formError === "permission" ? "You do not have permission for this action, or the discussion is closed." : "Could not save your reply. Please try again in a moment."}
    </p>}

    <section id="replies" className="mt-9 scroll-mt-8">
      <h2 className="text-2xl font-bold">Replies <span className="text-cyan-300">({replies?.length ?? 0})</span></h2>
      {repliesError ? <p className="research-panel mt-4 p-6 text-amber-200">Replies are unavailable right now.</p>
        : !replies?.length ? <p className="research-panel mt-4 p-6 text-slate-300">No replies yet.</p>
        : <div className="mt-4 grid gap-4">{replies.map((reply) => <article key={reply.id}
            className={`research-panel p-5 sm:p-6 ${thread.solution_reply_id === reply.id ? "border-emerald-400/60" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-cyan-200">{reply.author_name}{reply.author_id === user.id ? " (you)" : ""}</span>
              <time className="text-slate-400" dateTime={reply.created_at}>{new Date(reply.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-200">{reply.body}</p>
            {thread.solution_reply_id === reply.id && <p className="mt-4 text-sm font-semibold text-emerald-300">✓ Accepted answer</p>}
            {canManage && thread.status !== "closed" && thread.solution_reply_id !== reply.id &&
              <form action={stateAction} className="mt-4"><input type="hidden" name="status" value="answered" />
                <input type="hidden" name="solution_reply_id" value={reply.id} />
                <button className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">Mark as answer</button>
              </form>}
          </article>)}</div>}
    </section>

    {canReply && !repliesError && <form action={replyAction} className="research-panel mt-8 grid gap-4 p-6 sm:p-8">
      <h2 className="text-xl font-bold">Add a reply</h2>
      <textarea name="body" required minLength={2} maxLength={4000} rows={5}
        placeholder="Share an explanation, reference, or follow-up question."
        className="rounded-xl border border-white/20 bg-[#061726] p-4 text-white placeholder:text-slate-500" />
      <div><button type="submit" className="research-btn-primary">Post Reply</button></div>
    </form>}
    {thread.status === "closed" && <p className="mt-6 text-sm text-slate-400">This discussion is closed to new replies.</p>}
  </div>;
}
