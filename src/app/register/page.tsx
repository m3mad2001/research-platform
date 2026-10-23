"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import SupabaseSetupRequired from "../../components/SupabaseSetupRequired";
import PublicVisitCounter from "../../components/PublicVisitCounter";
import { AuthShell, AuthField } from "../../components/AuthShell";

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

    if (!fullName || !email || !password) { setErrorMessage("Please complete all required fields."); return; }
    if (password !== confirmPassword) { setErrorMessage("Passwords do not match."); return; }
    if (password.length < 6) { setErrorMessage("Password must contain at least 6 characters."); return; }
    if (!agreed) { setErrorMessage("Please agree to the platform terms."); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, institution, intended_use: intendedUse } },
    });
    setLoading(false);

    if (error) { setErrorMessage(error.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <AuthShell>
        <div className="ax-center">
          <span className="ax-success" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
          <h1>Request received</h1>
          <p className="ax-sub">
            Your account has been created and is now awaiting administrator approval.
            Your access begins only after approval.
          </p>
          <div className="ax-note" style={{ marginTop: "1.5rem", textAlign: "left" }}>
            <strong>Status: Pending approval</strong>
            Request submitted → Under review → Approved or rejected
          </div>
          <div style={{ display: "flex", gap: ".75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.75rem" }}>
            <Link href="/" className="ax-btn ax-btn-primary">Return to platform</Link>
            <Link href="/contact" className="ax-btn ax-btn-secondary">Contact us</Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <h1>Request access</h1>
      <p className="ax-sub">
        Create an account. Your request is reviewed by the platform administrator before access is activated.
      </p>

      <form onSubmit={handleSubmit} className="ax-form" noValidate>
        <AuthField id="full-name" label="Full name" value={fullName} onChange={setFullName}
          placeholder="Enter your full name" autoComplete="name" />
        <AuthField id="email" label="Email address" type="email" value={email} onChange={setEmail}
          placeholder="name@example.com" autoComplete="email" />
        <AuthField id="institution" label="Institution / organization" value={institution} onChange={setInstitution}
          placeholder="University, company, or organization" autoComplete="organization" />

        <div className="ax-fieldgroup">
          <label htmlFor="intended-use" className="ax-label">Intended use</label>
          <select id="intended-use" value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} className="ax-select">
            <option value="">Select one</option>
            <option value="Education / Learning">Education / Learning</option>
            <option value="Academic Research">Academic Research</option>
            <option value="Student Project">Student Project</option>
            <option value="Professional Development">Professional Development</option>
            <option value="Institutional Evaluation">Institutional Evaluation</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <AuthField id="password" label="Password" type="password" value={password} onChange={setPassword}
          placeholder="Create a secure password" autoComplete="new-password" />
        <AuthField id="confirm-password" label="Confirm password" type="password" value={confirmPassword}
          onChange={setConfirmPassword} placeholder="Repeat your password" autoComplete="new-password" />

        <label className="ax-check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I agree to the platform terms of use and understand that registration requires administrator approval.</span>
        </label>

        {errorMessage && <div role="alert" className="ax-error">{errorMessage}</div>}

        <button type="submit" disabled={loading} className="ax-btn ax-btn-primary ax-btn-lg ax-btn-block">
          {loading ? "Submitting…" : "Submit access request"}
        </button>
      </form>

      <PublicVisitCounter />

      <div className="ax-auth-foot">
        <p>Already registered? <Link href="/login">Sign in</Link></p>
      </div>
    </AuthShell>
  );
}
