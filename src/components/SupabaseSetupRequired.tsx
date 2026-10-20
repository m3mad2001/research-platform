import Link from "next/link";

export default function SupabaseSetupRequired() {
  return (
    <main className="research-shell flex min-h-screen items-center justify-center px-6 text-white">
      <div className="research-glass w-full max-w-xl rounded-3xl border border-amber-400/30 p-8 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          Setup required
        </p>
        <h1 className="mt-4 text-3xl font-bold">Connect your Supabase project</h1>
        <p className="mt-4 leading-7 text-slate-300">
          Login is unavailable until this installation has a project URL and
          publishable key. In the project root, copy <code>.env.example</code> to
          <code> .env.local</code> and replace both sample values with the values
          from your Supabase project. Restart the development server afterward.
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Use the publishable key, never a secret or service-role key.
        </p>
        <Link href="/" className="research-btn-primary mt-8 inline-flex text-sm">
          Back to platform
        </Link>
      </div>
    </main>
  );
}
