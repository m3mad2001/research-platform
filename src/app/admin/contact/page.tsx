import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "../../../components/HealthTwinBrand";
import { createClient } from "../../../utils/supabase/server";
import ContactStatusEditor from "./ContactStatusEditor";

export default async function AdminContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.status !== "approved") redirect("/");
  const { data: messages, error } = await supabase.from("contact_messages")
    .select("id,sender_name,sender_email,category,subject,message,status,created_at").order("created_at", { ascending: false }).limit(100);

  return <main className="research-shell min-h-screen px-6 py-10 text-white"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4"><BrandLockup />
      <Link href="/admin" className="research-btn-secondary text-sm">← Back to Admin</Link></header>
    <section className="healthtwin-library-hero mt-8 rounded-3xl p-8"><p className="research-section-title">Private inbox</p>
      <h1 className="mt-3 text-4xl font-bold">Contact requests</h1><p className="mt-3 text-slate-300">Review platform support and research collaboration messages. Sender email addresses remain inside the administration area.</p></section>
    {error ? <p role="alert" className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">Run <code>scripts/communications-and-visibility.sql</code> in Supabase before opening the contact inbox.</p>
      : !messages?.length ? <div className="research-panel mt-8 p-8 text-slate-300">No contact messages yet.</div>
      : <div className="mt-8 space-y-4">{messages.map((message) => <article key={message.id} className="research-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="research-badge">{message.category}</span>
          <h2 className="mt-3 text-xl font-bold">{message.subject}</h2><p className="mt-1 text-sm text-slate-400">{message.sender_name} · <a className="text-cyan-300 hover:underline" href={`mailto:${message.sender_email}`}>{message.sender_email}</a> · {new Date(message.created_at).toLocaleString("en-GB")}</p></div>
          <ContactStatusEditor id={message.id} initialStatus={message.status} /></div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-200">{message.message}</p>
      </article>)}</div>}
  </div></main>;
}
