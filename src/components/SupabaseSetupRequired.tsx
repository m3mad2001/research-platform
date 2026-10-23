import Link from "next/link";
import { AuthShell } from "./AuthShell";

export default function SupabaseSetupRequired() {
  return (
    <AuthShell>
      <p className="ax-eyebrow" style={{ color: "var(--orange)" }}>Setup required</p>
      <h1 style={{ marginTop: ".4rem" }}>Connect your Supabase project</h1>
      <p className="ax-sub">
        Login is unavailable until this installation has a project URL and publishable key. In the project root,
        copy <code>.env.example</code> to <code>.env.local</code> and replace both sample values with the values
        from your Supabase project. Restart the development server afterward.
      </p>
      <p className="ax-sub">Use the publishable key, never a secret or service-role key.</p>
      <Link href="/" className="ax-btn ax-btn-primary" style={{ marginTop: "1.5rem" }}>Back to platform</Link>
    </AuthShell>
  );
}