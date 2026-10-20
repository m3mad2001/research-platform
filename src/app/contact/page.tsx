import Link from "next/link";
import { BrandLockup, PillarStrip } from "../../components/HealthTwinBrand";
import ContactForm from "./ContactForm";

export default function ContactPage() {
  return <main className="research-shell min-h-screen px-6 py-10 text-white">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <BrandLockup />
        <div className="flex gap-3"><Link href="/" className="research-btn-secondary text-sm">Platform Home</Link>
          <Link href="/login" className="research-btn-primary text-sm">Sign In</Link></div>
      </header>
      <PillarStrip compact />
      <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="healthtwin-library-hero rounded-3xl p-8 lg:p-10">
          <p className="research-section-title">Contact Engineering Nexus</p>
          <h1 className="mt-4 text-4xl font-bold">Let&apos;s move research forward.</h1>
          <p className="mt-5 leading-7 text-slate-300">Ask about access, platform support, a resource, or a potential research collaboration. Your message is sent privately to the platform team.</p>
          <div className="mt-8 space-y-4 text-sm text-slate-300">
            <p className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">Access and account support</p>
            <p className="rounded-xl border border-violet-400/15 bg-violet-400/5 p-4">Technical and resource questions</p>
            <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4">Research collaboration enquiries</p>
          </div>
        </section>
        <ContactForm />
      </div>
    </div>
  </main>;
}
