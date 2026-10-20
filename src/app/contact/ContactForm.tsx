"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setStatus(null);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      formElement.reset();
      setStatus({ ok: true, message: "Your message has been received. The research team can now review it." });
    } catch (error) {
      setStatus({ ok: false, message: error instanceof Error ? error.message : "Unable to send your message." });
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="research-panel space-y-5 p-6 sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field name="name" label="Name" autoComplete="name" maxLength={120} />
      <Field name="email" label="Email" type="email" autoComplete="email" maxLength={254} />
    </div>
    <div>
      <label htmlFor="category" className="mb-2 block text-sm font-semibold text-slate-200">Category</label>
      <select id="category" name="category" defaultValue="General"
        className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400">
        <option>General</option><option>Access</option><option>Technical</option>
        <option>Research collaboration</option><option>Other</option>
      </select>
    </div>
    <Field name="subject" label="Subject" minLength={3} maxLength={160} />
    <div>
      <label htmlFor="message" className="mb-2 block text-sm font-semibold text-slate-200">Message</label>
      <textarea id="message" name="message" required minLength={10} maxLength={5000} rows={7}
        className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400"
        placeholder="How can the Engineering Nexus team help?" />
    </div>
    <div className="hidden" aria-hidden="true">
      <label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" />
    </div>
    {status && <p role={status.ok ? "status" : "alert"}
      className={`rounded-xl border p-4 text-sm ${status.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
      {status.message}
    </p>}
    <button type="submit" disabled={loading} className="research-btn-primary disabled:opacity-50">
      {loading ? "Sending..." : "Send Message"}
    </button>
  </form>;
}

function Field({ name, label, type = "text", ...props }: {
  name: string; label: string; type?: string; autoComplete?: string; minLength?: number; maxLength?: number;
}) {
  return <div>
    <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-200">{label}</label>
    <input id={name} name={name} type={type} required {...props}
      className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
  </div>;
}
