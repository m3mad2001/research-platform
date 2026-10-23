"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { expiryInputToIso, expiryInputValue, hasNoExpiry } from "../../lib/access-policy";

export default function ApproveButton({ userId, initialExpiresAt }: {
  userId: string;
  initialExpiresAt: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [period, setPeriod] = useState(hasNoExpiry(initialExpiresAt) ? "none" : initialExpiresAt ? "custom" : "30");
  const [customDate, setCustomDate] = useState(expiryInputValue(initialExpiresAt));
  const router = useRouter();

  async function approveUser() {
    setMessage("");
    const expiresAt = period === "custom" ? expiryInputToIso(customDate) : null;
    if (period === "custom" && (!expiresAt || Date.parse(expiresAt) <= Date.now())) {
      setMessage("Choose a future expiry date and time.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedStatus: "pending",
          expectedExpiresAt: initialExpiresAt,
          expiresAt,
          days: ["7", "30", "90"].includes(period) ? Number(period) : null,
          noExpiry: period === "none",
        }),
      });
      const result = await response.json() as { error?: string; emailSent?: boolean };
      if (!response.ok) {
        setMessage(result.error || "Unable to approve access.");
        return;
      }
      setMessage(result.emailSent
        ? "Approved ✓ Email and in-platform notification sent."
        : "Approved ✓ In-platform notification sent. Email delivery is not configured or failed.");
      router.refresh();
    } catch {
      setMessage("Unable to approve access. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-300">
        Access duration
        <select value={period} disabled={loading} onChange={(event) => { setPeriod(event.target.value); setMessage(""); }}
          className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="custom">Custom expiry date</option>
          <option value="none">No expiry</option>
        </select>
      </label>
      {period === "custom" && <label className="block text-xs text-slate-300">
        Expiry — Saudi time (UTC+03:00)
        <input type="datetime-local" value={customDate} disabled={loading}
          onChange={(event) => { setCustomDate(event.target.value); setMessage(""); }}
          className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white [color-scheme:light_dark]" />
      </label>}
      <button type="button" onClick={approveUser} disabled={loading}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-cyan-400 disabled:opacity-50">
        {loading ? "Approving..." : "Approve"}
      </button>
      {message && <p role="status" className="text-xs text-cyan-200">{message}</p>}
    </div>
  );
}
