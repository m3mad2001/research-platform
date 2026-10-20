"use client";

import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";

export default function ContactStatusEditor({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  async function update(nextStatus: string) {
    setSaving(true);
    const { error } = await createClient().rpc("set_contact_message_status", { p_message_id: id, p_status: nextStatus });
    if (!error) setStatus(nextStatus);
    setSaving(false);
  }
  return <select value={status} disabled={saving} onChange={(event) => void update(event.target.value)} aria-label="Message status"
    className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50">
    <option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
  </select>;
}
