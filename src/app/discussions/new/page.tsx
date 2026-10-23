import Link from "next/link";
import { askQuestion } from "../actions";
import { discussionTopics, requireDiscussionAccess } from "../../../lib/discussion-access";

export default async function NewDiscussionPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user, isAdmin } = await requireDiscussionAccess();
  const { error: formError } = await searchParams;
  const { data: grants } = isAdmin ? { data: [] } : await supabase.from("user_resource_access")
    .select("resource_key").eq("user_id", user.id);
  const allowedTopics = isAdmin ? discussionTopics : discussionTopics.filter((topic) =>
    topic.key === "general" || (grants ?? []).some((grant) => grant.resource_key === topic.key));

  return <div className="mx-auto max-w-3xl">
    <Link href="/discussions" className="text-sm text-cyan-300">← All discussions</Link>
    <h1 className="mt-5 text-3xl font-bold">Ask a Research Question</h1>
    <p className="mt-2 text-slate-300">Choose a topic you can access. Your profile name will be visible to participants who can read the discussion.</p>
    <form action={askQuestion} className="research-panel mt-7 grid gap-5 p-6 sm:p-8">
      {formError && <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
        {formError === "invalid" ? "Enter a title (5–160 characters) and question (10–6000 characters), then choose an available topic." : "Could not save your question. Check your access or wait a moment and try again."}
      </p>}
      <label className="grid gap-2 text-sm font-medium">Topic
        <select name="resource_key" required className="min-h-12 rounded-xl border border-white/20 bg-[var(--bg)] px-4 text-white">
          {allowedTopics.map((topic) => <option key={topic.key} value={topic.key}>{topic.label}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">Question title
        <input name="title" type="text" minLength={5} maxLength={160} required placeholder="What would you like to discuss?"
          className="min-h-12 rounded-xl border border-white/20 bg-[var(--bg)] px-4 text-white placeholder:text-slate-500" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Details
        <textarea name="body" minLength={10} maxLength={6000} required rows={9}
          placeholder="Describe your question, what you have tried, and the resource it relates to."
          className="rounded-xl border border-white/20 bg-[var(--bg)] p-4 text-white placeholder:text-slate-500" />
      </label>
      <div className="flex flex-wrap items-center gap-4"><button type="submit" className="research-btn-primary">Post Question</button>
        <Link href="/discussions" className="text-sm text-slate-300 hover:text-white">Cancel</Link></div>
    </form>
  </div>;
}
