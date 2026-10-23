"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import SupabaseSetupRequired from "../../components/SupabaseSetupRequired";
import { AuthShell, AuthField } from "../../components/AuthShell";
import { hasActiveAccess } from "../../lib/access-policy";

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SupabaseSetupRequired />;
  return <LoginForm />;
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Create the analytics session after a successful login.
  async function startPlatformSession(userId: string) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("user_sessions").insert({ user_id: userId }).select("id").single();
    if (sessionError || !sessionData) {
      console.error("Unable to create analytics session:", sessionError);
      return; // analytics must never block access
    }
    localStorage.setItem("platform_session_id", sessionData.id);
    const { error: eventError } = await supabase.from("activity_events").insert({
      user_id: userId, session_id: sessionData.id,
      event_type: "login", resource_type: "platform", resource_id: "main",
    });
    if (eventError) console.error("Unable to record login event:", eventError);
  }

  async function reject(message: string) {
    await supabase.auth.signOut();
    setLoading(false);
    setErrorMessage(message);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!email || !password) {
      setErrorMessage("Please enter your email address and password.");
      return;
    }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      setLoading(false);
      setErrorMessage(authError?.message || "Unable to sign in.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, role, status, approved_at, expires_at")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup failed:", profileError);
      return reject("Your password was accepted, but your platform profile is missing or inaccessible. Ask the administrator to check your profile and its access policy.");
    }
    if (profile.status === "pending") return reject("Your account is still awaiting administrator approval.");
    if (profile.status === "suspended") return reject("Your account has been suspended. Please contact the platform administrator.");
    if (profile.status === "expired") return reject("Your access period has expired.");

    if (profile.role === "admin" && profile.status === "approved") {
      await startPlatformSession(authData.user.id);
      router.push("/admin");
      return;
    }

    if (profile.role === "user" && profile.status === "approved") {
      if (!hasActiveAccess(profile)) {
        return reject(profile.expires_at
          ? "Your access period has expired. Please contact the administrator."
          : "Your access period has not been configured. Please contact the administrator.");
      }
      await startPlatformSession(authData.user.id);
      router.push("/dashboard");
      return;
    }

    return reject("Your account does not currently have platform access.");
  }

  return (
    <AuthShell>
      <h1>Sign in</h1>
      <p className="ax-sub">Use your approved Engineering Nexus account to open your workspace.</p>

      <form onSubmit={handleSubmit} className="ax-form" noValidate>
        <AuthField id="email" label="Email address" type="email" value={email} onChange={setEmail}
          placeholder="name@example.com" autoComplete="email" />
        <AuthField id="password" label="Password" type="password" value={password} onChange={setPassword}
          placeholder="Enter your password" autoComplete="current-password" />

        {errorMessage && <div role="alert" className="ax-error">{errorMessage}</div>}

        <button type="submit" disabled={loading} className="ax-btn ax-btn-primary ax-btn-lg ax-btn-block">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <hr className="ax-divider" />
      <div className="ax-note">
        <strong>Controlled research access</strong>
        Access is available only to approved users with an active research period. New requests start after administrator approval.
      </div>

      <div className="ax-auth-foot">
        <p>Don&apos;t have an account? <Link href="/register">Request access</Link></p>
        <p><Link href="/contact">Need help? Contact us</Link></p>
      </div>
    </AuthShell>
  );
}