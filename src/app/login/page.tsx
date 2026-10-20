"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import SupabaseSetupRequired from "../../components/SupabaseSetupRequired";
import { BrandLockup, PillarStrip } from "../../components/HealthTwinBrand";
import { hasActiveAccess } from "../../lib/access-policy";

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SupabaseSetupRequired />;
  return <LoginForm />;
}

function LoginForm() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // Create analytics session after successful login
  // =========================================================
  async function startPlatformSession(userId: string) {
    // Create a new user session
    const { data: sessionData, error: sessionError } = await supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
      })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      console.error(
        "Unable to create analytics session:",
        sessionError
      );

      // Do not block platform access if analytics fails
      return;
    }

    // Save current session ID locally.
    // We will use this later for:
    // heartbeat, active time, logout, downloads, videos, explorer, etc.
    localStorage.setItem(
      "platform_session_id",
      sessionData.id
    );

    // Record login activity event
    const { error: eventError } = await supabase
      .from("activity_events")
      .insert({
        user_id: userId,
        session_id: sessionData.id,
        event_type: "login",
        resource_type: "platform",
        resource_id: "main",
      });

    if (eventError) {
      console.error(
        "Unable to record login event:",
        eventError
      );
    }
  }

  // =========================================================
  // Login
  // =========================================================
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage(
        "Please enter your email address and password."
      );
      return;
    }

    setLoading(true);

    // ---------------------------------------------------------
    // 1. Login using Supabase Authentication
    // ---------------------------------------------------------
    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);

      setErrorMessage(
        authError?.message || "Unable to sign in."
      );

      return;
    }

    // ---------------------------------------------------------
    // 2. Read platform profile
    // ---------------------------------------------------------
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, email, role, status, approved_at, expires_at"
      )
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setLoading(false);

      console.error("Profile lookup failed:", profileError);
      setErrorMessage(
        "Your password was accepted, but your platform profile is missing or inaccessible. Ask the administrator to check your profile and its access policy."
      );

      return;
    }

    // ---------------------------------------------------------
    // 3. Pending account
    // ---------------------------------------------------------
    if (profile.status === "pending") {
      await supabase.auth.signOut();

      setLoading(false);

      setErrorMessage(
        "Your account is still awaiting administrator approval."
      );

      return;
    }

    // ---------------------------------------------------------
    // 4. Suspended account
    // ---------------------------------------------------------
    if (profile.status === "suspended") {
      await supabase.auth.signOut();

      setLoading(false);

      setErrorMessage(
        "Your account has been suspended. Please contact the platform administrator."
      );

      return;
    }

    // ---------------------------------------------------------
    // 5. Account already marked expired
    // ---------------------------------------------------------
    if (profile.status === "expired") {
      await supabase.auth.signOut();

      setLoading(false);

      setErrorMessage(
        "Your access period has expired."
      );

      return;
    }

    // ---------------------------------------------------------
    // 6. Approved Admin
    // ---------------------------------------------------------
    if (
      profile.role === "admin" &&
      profile.status === "approved"
    ) {
      // Start analytics session
      await startPlatformSession(authData.user.id);

      // Redirect to Admin Dashboard
      window.location.href = "/admin";

      return;
    }

    // ---------------------------------------------------------
    // 7. Approved normal user
    // ---------------------------------------------------------
    if (
      profile.role === "user" &&
      profile.status === "approved"
    ) {
      // Authorization includes finite expiry and administrator-selected no expiry.
      if (!hasActiveAccess(profile)) {
        await supabase.auth.signOut();

        setLoading(false);

        setErrorMessage(
          profile.expires_at ? "Your access period has expired. Please contact the administrator." : "Your access period has not been configured. Please contact the administrator."
        );

        return;
      }

      // Start analytics session
      await startPlatformSession(authData.user.id);

      window.location.assign("/dashboard");

      return;
    }

    // ---------------------------------------------------------
    // 8. Unknown / invalid access condition
    // ---------------------------------------------------------
    await supabase.auth.signOut();

    setLoading(false);

    setErrorMessage(
      "Your account does not currently have platform access."
    );
  }

  // =========================================================
  // UI
  // =========================================================
  return (
    <main className="healthtwin-auth-page min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <div className="healthtwin-auth-card grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl lg:grid-cols-2">

          {/* Left */}
          <div className="healthtwin-auth-aside p-8 sm:p-12">
            <BrandLockup />
            <Link
              href="/"
              className="text-sm font-semibold text-cyan-400"
            >
              ← Back to Platform
            </Link>

            <div className="mt-20">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Welcome Back
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight">From Silicon to<br /><span className="text-cyan-300">Intelligent Healthcare</span></h1>

              <p className="mt-6 max-w-sm leading-7 text-slate-400">
                Access your courses, software, firmware,
                interactive explorers, datasets, and research
                tools.
              </p>

              <div className="mt-10 rounded-2xl border border-white/10 bg-[#061726]/75 p-5">
                <p className="font-semibold text-white">
                  Controlled Research Access
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Access is available only to approved users
                  with an active research period.
                </p>
              </div>
            </div>
          </div>

          {/* Login */}
          <div className="healthtwin-auth-form p-8 sm:p-12">
            <div className="lg:hidden">
              <Link
                href="/"
                className="text-sm font-semibold text-cyan-400"
              >
                ← Back
              </Link>
            </div>

            <h2 className="mt-6 text-3xl font-bold lg:mt-0">
              Login
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in using your approved platform account.
            </p>
            <PillarStrip compact />

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm leading-6 text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Signing in..."
                  : "Login to Platform"}
              </button>
            </form>

            <div className="my-8 border-t border-white/10" />

            {/* Pending information */}
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-sm font-semibold text-amber-300">
                Account pending approval?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Your access starts only after
                administrator approval.
              </p>
            </div>

            <p className="mt-7 text-center text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Request Access
              </Link>
            </p>
            <p className="mt-3 text-center text-sm"><Link href="/contact" className="font-semibold text-cyan-400 hover:text-cyan-300">Need help? Contact Us</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}
