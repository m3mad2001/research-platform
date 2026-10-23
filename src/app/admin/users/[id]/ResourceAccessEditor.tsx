"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import { resourceOptions, type ResourceKey } from "../../../../lib/resources";

export default function ResourceAccessEditor({
  userId,
  initialKeys,
  initialInstructor,
  initialSiloEditor,
  initialResponder,
  responderAvailable,
}: {
  userId: string;
  initialKeys: ResourceKey[];
  initialInstructor: boolean;
  initialSiloEditor: boolean;
  initialResponder: boolean;
  responderAvailable: boolean;
}) {
  const [selected, setSelected] = useState<ResourceKey[]>(initialKeys);
  const [instructor, setInstructor] = useState(initialInstructor);
  const [siloEditor, setSiloEditor] = useState(initialSiloEditor);
  const [responder, setResponder] = useState(initialResponder);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  function toggle(key: ResourceKey) {
    setMessage("");
    if (key === "courses" && selected.includes("courses")) setInstructor(false);
    if (key === "silo" && selected.includes("silo")) setSiloEditor(false);
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("set_user_resources", {
      target_user_id: userId,
      resource_keys: selected,
    });
    const instructorError = !error && selected.includes("courses")
      ? (await supabase.rpc("set_course_instructor", {
          target_user_id: userId,
          enabled: instructor,
        })).error
      : null;
    const siloEditorError = !error
      ? (await supabase.rpc("set_silo_editor", {
          target_user_id: userId,
          enabled: siloEditor && selected.includes("silo"),
        })).error
      : null;
    const responderError = !error && responderAvailable
      ? (await supabase.rpc("set_discussion_responder", {
          p_user_id: userId,
          p_enabled: responder,
        })).error
      : null;
    setSaving(false);
    setMessage(error ? `Unable to save: ${error.message}` : instructorError
      ? `Cards saved, but Instructor permission failed: ${instructorError.message}`
      : siloEditorError ? `Cards saved, but SILO Editor permission failed: ${siloEditorError.message}`
      : responderError ? `Cards saved, but Discussions responder permission failed: ${responderError.message}`
      : "Resource access saved.");
    if (!error) router.refresh();
  }

  return (
    <section className="mt-8 rounded-2xl border border-cyan-400/25 bg-[var(--card)] p-6">
      <h2 className="text-xl font-bold">Resource Access</h2>
      <p className="mt-2 text-sm text-slate-300">
        Choose which cards this user may access. A new account starts with no resources.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {resourceOptions.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => toggle(key)}
              className="h-4 w-4 accent-cyan-400"
            />
            {label}
          </label>
        ))}
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
        <input type="checkbox" checked={instructor && selected.includes("courses")}
          disabled={!selected.includes("courses")}
          onChange={(event) => setInstructor(event.target.checked)}
          className="h-4 w-4 accent-cyan-400" />
        <span><strong>Course Instructor</strong> — may create, edit, and publish their own courses.</span>
      </label>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
        <input type="checkbox" checked={siloEditor && selected.includes("silo")}
          disabled={!selected.includes("silo")}
          onChange={(event) => setSiloEditor(event.target.checked)}
          className="h-4 w-4 accent-cyan-400" />
        <span><strong>SILO Editor</strong> — may create, edit, and publish their own SILO projects.</span>
      </label>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
        <input type="checkbox" checked={responder} disabled={!responderAvailable}
          onChange={(event) => setResponder(event.target.checked)} className="h-4 w-4 accent-cyan-400" />
        <span><strong>Discussion Responder</strong> — may reply to research questions in resources this user can access.</span>
      </label>
      {!responderAvailable && <p className="mt-2 text-sm text-amber-200">Run scripts/research-discussions.sql to enable discussion permissions.</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="research-btn-primary disabled:opacity-50">
          {saving ? "Saving..." : "Save Access"}
        </button>
        {message && <p role="status" className="text-sm text-cyan-200">{message}</p>}
      </div>
    </section>
  );
}
