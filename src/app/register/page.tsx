"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import SupabaseSetupRequired from "../../components/SupabaseSetupRequired";
import PublicVisitCounter from "../../components/PublicVisitCounter";
import { BrandLockup, PillarStrip } from "../../components/HealthTwinBrand";

export default function RegisterPage() {
  if (!isSupabaseConfigured()) return <SupabaseSetupRequired />;
  return <RegisterForm />;
}

function RegisterForm() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!fullName || !email || !password) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must contain at least 6 characters.");
      return;
    }

    if (!agreed) {
      setErrorMessage("Please agree to the platform terms.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          institution,
          intended_use: intendedUse,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="healthtwin-auth-page flex min-h-screen items-center justify-center px-6 text-white">
        <div className="healthtwin-auth-card w-full max-w-xl rounded-3xl border border-cyan-400/20 p-10 text-center shadow-2xl">
          <div className="mb-7 flex justify-center"><BrandLockup compact /></div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-3xl text-cyan-400">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            Access Request Received
          </h1>
          <p className="mt-3 text-sm text-cyan-200">Request Submitted → Under Review → Approved or Rejected</p>

          <p className="mt-4 leading-7 text-slate-400">
            Your account has been created successfully and is now awaiting
            administrator approval.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-5">
            <p className="font-semibold text-cyan-400">
              Status: Pending Approval
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your access will begin only after your account has
              been approved.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link
            href="/"
            className="inline-flex rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >Return to Platform</Link><Link href="/contact" className="research-btn-secondary">Contact Us</Link></div>
        </div>
      </main>
    );
  }

  return (
    <main className="healthtwin-auth-page min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <div className="healthtwin-auth-card grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl lg:grid-cols-2">

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
                Research Access
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight">From Silicon to<br /><span className="text-cyan-300">Intelligent Healthcare</span></h1>

              <p className="mt-6 max-w-sm leading-7 text-slate-400">
                Create your account to request access to engineering courses,
                research software, firmware, datasets, and interactive tools.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="healthtwin-auth-form p-8 sm:p-12">
            <h2 className="text-3xl font-bold">
              Request Access
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Create an account. Your request will be reviewed by the platform
              administrator before access is activated.
            </p>
            <PillarStrip compact />

            <PublicVisitCounter />

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">

              <Field
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={setFullName}
              />

              <Field
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={setEmail}
              />

              <Field
                label="Institution / Organization"
                type="text"
                placeholder="University, company, or organization"
                value={institution}
                onChange={setInstitution}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Intended Use
                </label>

                <select
                  value={intendedUse}
                  onChange={(e) => setIntendedUse(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-300 outline-none transition focus:border-cyan-400"
                >
                  <option value="">
                    Select one
                  </option>

                  <option value="Education / Learning">
                    Education / Learning
                  </option>

                  <option value="Academic Research">
                    Academic Research
                  </option>

                  <option value="Student Project">
                    Student Project
                  </option>

                  <option value="Professional Development">
                    Professional Development
                  </option>

                  <option value="Institutional Evaluation">
                    Institutional Evaluation
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <Field
                label="Password"
                type="password"
                placeholder="Create a secure password"
                value={password}
                onChange={setPassword}
              />

              <Field
                label="Confirm Password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />

              <label className="flex items-start gap-3 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />

                <span>
                  I agree to the platform terms of use and understand that
                  registration requires administrator approval.
                </span>
              </label>

              {errorMessage && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Submitting..."
                  : "Submit Access Request"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-400">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
      />
    </div>
  );
}
