"use client";

import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { resourceOptions, type ResourceKey, type ResourceVisibilityMode } from "../../../lib/resources";

export default function ResourceVisibilityEditor({ initialModes }: { initialModes: Record<ResourceKey, ResourceVisibilityMode> }) {
  const [modes, setModes] = useState(initialModes);
  const [saving, setSaving] = useState<ResourceKey | null>(null);
  const [message, setMessage] = useState("");

  async function update(key: ResourceKey, mode: ResourceVisibilityMode) {
    setSaving(key); setMessage("");
    const { error } = await createClient().rpc("set_resource_visibility", {
      p_resource_key: key, p_display_mode: mode,
    });
    setSaving(null);
    if (error) setMessage(`Unable to save ${resourceOptions.find((item) => item.key === key)?.label}: ${error.message}`);
    else {
      setModes((current) => ({ ...current, [key]: mode }));
      setMessage("Visibility updated.");
    }
  }

  return <div className="research-panel mt-8 overflow-hidden">
    <div className="border-b border-white/10 p-6">
      <h2 className="text-xl font-bold">Subscriber card visibility</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300"><strong>Visible</strong> shows a card only to assigned subscribers. <strong>Locked</strong> also previews it to unassigned subscribers. <strong>Hidden</strong> removes and blocks it for all subscribers.</p>
    </div>
    <div className="divide-y divide-white/10">{resourceOptions.map((resource) =>
      <div key={resource.key} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div><h3 className="font-semibold text-white">{resource.label}</h3>
          <p className="mt-1 text-xs uppercase tracking-wider text-cyan-300">Current: {modes[resource.key]}</p></div>
        <div className="flex flex-wrap gap-2">{(["visible","locked","hidden"] as const).map((mode) =>
          <button type="button" key={mode} disabled={saving === resource.key} onClick={() => void update(resource.key, mode)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition disabled:opacity-50 ${modes[resource.key] === mode ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-white/15 bg-slate-950/60 text-slate-200 hover:border-cyan-400/50"}`}>
            {mode}
          </button>)}</div>
      </div>)}</div>
    {message && <p role="status" className="border-t border-white/10 p-5 text-sm text-cyan-200">{message}</p>}
  </div>;
}
