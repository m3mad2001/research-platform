"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import {
  accessControlError, effectiveAccessStatus, expiryInputToIso, expiryInputValue,
  formatAccessExpiry, hasNoExpiry,
} from "../../../../lib/access-policy";

type AccessAction = "set" | "approve" | "extend" | "resume" | "suspend" | "revoke";

export default function AccessPeriodEditor({
  userId, initialStatus, initialExpiresAt,
}: { userId: string; initialStatus: string; initialExpiresAt: string | null }) {
  const [mode, setMode] = useState(hasNoExpiry(initialExpiresAt) ? "none" : "date");
  const [date, setDate] = useState(expiryInputValue(initialExpiresAt));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const status = effectiveAccessStatus({ role: "user", status: initialStatus, expires_at: initialExpiresAt });
  const needsApproval = status === "pending" || status === "expired";

  async function perform(action: AccessAction, days?: number) {
    setMessage("");
    setFailed(false);
    let expiresAt: string | null = null;
    if ((action === "set" || action === "approve") && mode === "date") {
      expiresAt = expiryInputToIso(date);
      if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
        setFailed(true);
        setMessage("Choose a future expiry date and time, or select No expiry.");
        return;
      }
    }
    setSaving(true);
    try {
      const { error } = await createClient().rpc("manage_user_access", {
        p_user_id: userId,
        p_action: action,
        p_expected_status: initialStatus,
        p_expected_expires_at: initialExpiresAt,
        p_expires_at: expiresAt,
        p_days: days ?? null,
        p_no_expiry: (action === "set" || action === "approve") && mode === "none",
      });
      if (error) {
        setFailed(true);
        setMessage(accessControlError(error));
        return;
      }
      setMessage("Access updated.");
      router.refresh();
    } catch {
      setFailed(true);
      setMessage("Unable to update access. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="research-panel mt-8 p-6" aria-labelledby="access-period-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="research-section-title">Account Access</p>
          <h2 id="access-period-heading" className="mt-2 text-xl font-bold">Access Period &amp; Status</h2>
          <p className="mt-2 text-sm text-slate-300">Set this user&apos;s access duration and account status.</p>
        </div>
        <span className="research-badge capitalize">{status}</span>
      </div>
      <p className="mt-4 text-sm text-slate-300">Current expiry: <strong className="text-cyan-200">{formatAccessExpiry(initialExpiresAt)}</strong></p>
      <fieldset disabled={saving} className="mt-5 space-y-4 disabled:opacity-60">
        <legend className="sr-only">Access duration</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Access duration
            <select value={mode} onChange={(event) => { setMode(event.target.value); setMessage(""); }}
              className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white">
              <option value="date">Custom expiry date</option>
              <option value="none">No expiry</option>
            </select>
          </label>
          {mode === "date" && <label className="text-sm text-slate-300">
            Expiry date and time — Saudi time (UTC+03:00)
            <input type="datetime-local" value={date} onChange={(event) => { setDate(event.target.value); setMessage(""); }}
              className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white [color-scheme:light_dark]" />
          </label>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => perform("set")} className="research-btn-primary">
            {saving ? "Updating..." : "Save Access Settings"}
          </button>
          {needsApproval && <button type="button" onClick={() => perform("approve")} className="research-btn-secondary">
            {status === "pending" ? "Approve Access" : "Renew Access"}
          </button>}
          {status === "suspended" && <button type="button" onClick={() => perform("resume")} className="research-btn-secondary">Resume Access</button>}
        </div>
        {status === "pending" && <p className="text-xs text-slate-400">Saving settings keeps this request pending until you approve access.</p>}
        {status === "suspended" && <p className="text-xs text-slate-400">Save a future expiry or No expiry, then resume the account when ready.</p>}
        {initialStatus !== "pending" && !hasNoExpiry(initialExpiresAt) && <div className="border-t border-white/10 pt-5">
          <p className="text-sm font-semibold text-white">Quick extension</p>
          <p className="mt-1 text-xs text-slate-400">Add time to the saved expiry, or start from today if it has passed. Expired accounts are renewed; suspended accounts require Resume Access.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {[7, 30, 90].map((days) => <button key={days} type="button" onClick={() => perform("extend", days)} className="research-btn-secondary">+{days} Days</button>)}
          </div>
        </div>}
        {initialStatus !== "pending" && <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
          {initialStatus !== "suspended" && <button type="button" onClick={() => perform("suspend")}
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">Suspend Access</button>}
          <button type="button" onClick={() => perform("revoke")}
            className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">Revoke Access</button>
        </div>}
      </fieldset>
      {message && <p role={failed ? "alert" : "status"} className={`mt-4 text-sm ${failed ? "text-amber-200" : "text-cyan-200"}`}>{message}</p>}
    </section>
  );
}
