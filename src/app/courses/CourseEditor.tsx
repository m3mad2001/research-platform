"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import CourseReadme from "./CourseReadme";

type Lesson = { title: string; video_url: string };
type Course = { id: string; title: string; description: string; supplementary_url: string | null; readme_markdown: string; status: string; is_visible: boolean };
type CourseFile = { id: string; file_name: string; storage_path: string; size_bytes: number };
const maxFileSize = 25 * 1024 * 1024;
const maxReadmeSize = 128 * 1024;

function saveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message : "Unknown error. Please try again.";
  if (message.includes("supplementary_url") && (message.includes("schema cache") || message.includes("does not exist"))) {
    return "The database is missing the supplementary link update. Run scripts/course-supplementary-link.sql in Supabase SQL Editor, then try again.";
  }
  return message;
}

export default function CourseEditor({
  initialCourse,
  initialLessons = [],
  initialFiles = [],
}: {
  initialCourse?: Course;
  initialLessons?: Lesson[];
  initialFiles?: CourseFile[];
}) {
  const [title, setTitle] = useState(initialCourse?.title ?? "");
  const [description, setDescription] = useState(initialCourse?.description ?? "");
  const [supplementaryUrl, setSupplementaryUrl] = useState(initialCourse?.supplementary_url ?? "");
  const [readmeMarkdown, setReadmeMarkdown] = useState(initialCourse?.readme_markdown ?? "");
  const [isVisible, setIsVisible] = useState(initialCourse?.is_visible ?? true);
  const [previewReadme, setPreviewReadme] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons.map(({ title, video_url }) => ({ title, video_url })));
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [draftId, setDraftId] = useState(initialCourse?.id);
  const [files, setFiles] = useState(initialFiles);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  function updateLesson(index: number, field: keyof Lesson, value: string) {
    setLessons((current) => current.map((lesson, i) => i === index ? { ...lesson, [field]: value } : lesson));
  }

  async function save(publish: boolean) {
    setMessage("");
    const cleanTitle = title.trim();
    const cleanSupplementaryUrl = supplementaryUrl.trim();
    if (new TextEncoder().encode(readmeMarkdown).length > maxReadmeSize) {
      setMessage("README.md must be no larger than 128 KB."); return;
    }
    const cleanLessons = lessons.map((lesson) => ({ title: lesson.title.trim(), video_url: lesson.video_url.trim() }))
      .filter((lesson) => lesson.title || lesson.video_url);
    if (cleanTitle.length < 3 || cleanTitle.length > 160 || description.length > 2000) {
      setMessage("Course title must be 3–160 characters and description at most 2000."); return;
    }
    if (cleanSupplementaryUrl) {
      try {
        const url = new URL(cleanSupplementaryUrl);
        if (url.protocol !== "https:" || !url.hostname || cleanSupplementaryUrl.length > 2048) throw new Error("Invalid link");
      } catch {
        setMessage("Supplementary link must be a valid HTTPS URL (maximum 2048 characters)."); return;
      }
    }
    if (cleanLessons.length > 50 || cleanLessons.some((lesson) => {
      try { return !lesson.title || lesson.title.length > 160 || new URL(lesson.video_url).protocol !== "https:"; }
      catch { return true; }
    })) {
      setMessage("Each added lesson needs a title and valid HTTPS video link (up to 50 lessons)."); return;
    }
    if (newFiles.some((file) => !/\.(pdf|zip)$/i.test(file.name) || file.size < 1
      || file.size > maxFileSize || file.name.length > 200)) {
      setMessage("Files must be PDF or ZIP, nonempty, and no larger than 25 MB each."); return;
    }

    setSaving(true);
    const supabase = createClient();
    let courseId = draftId;
    try {
      if (courseId) {
        const { data: updated, error } = await supabase.from("courses").update({
          title: cleanTitle, description: description.trim(), supplementary_url: cleanSupplementaryUrl || null,
          readme_markdown: readmeMarkdown,
          is_visible: isVisible,
          status: "draft", updated_at: new Date().toISOString(),
        }).eq("id", courseId).select("id").maybeSingle();
        if (error || !updated) throw error ?? new Error("Course editing is not permitted.");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please sign in again.");
        const { data, error } = await supabase.from("courses").insert({
          author_id: user.id, title: cleanTitle, description: description.trim(),
          supplementary_url: cleanSupplementaryUrl || null, readme_markdown: readmeMarkdown,
          is_visible: isVisible, status: "draft",
        }).select("id").single();
        if (error || !data) throw error ?? new Error("Unable to create course.");
        courseId = data.id;
        setDraftId(courseId);
      }

      const { error: lessonError } = await supabase.rpc("replace_course_lessons", {
        target_course_id: courseId, lesson_rows: cleanLessons,
      });
      if (lessonError) throw lessonError;

      for (const file of newFiles) {
        const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "zip";
        const path = `${courseId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("course-materials")
          .upload(path, file, { contentType: ext === "pdf" ? "application/pdf" : "application/zip", upsert: false });
        if (uploadError) throw uploadError;

        const { error: recordError } = await supabase.from("course_files").insert({
          course_id: courseId, storage_path: path, file_name: file.name, size_bytes: file.size,
        });
        if (recordError) {
          await supabase.storage.from("course-materials").remove([path]);
          throw recordError;
        }
        setNewFiles((current) => current.filter((item) => item !== file));
      }

      if (publish) {
        const { data: updated, error } = await supabase.from("courses").update({
          status: "published", updated_at: new Date().toISOString(),
        }).eq("id", courseId).select("id").maybeSingle();
        if (error || !updated) throw error ?? new Error("Publishing is not permitted.");
      }
      router.push(`/courses/${courseId}`);
      router.refresh();
    } catch (error) {
      setMessage(`Could not finish saving. The course may remain a draft. ${saveErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeFile(file: CourseFile) {
    if (saving || !draftId) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: removed, error } = await supabase.from("course_files").delete().eq("id", file.id).select("id").maybeSingle();
    if (error || !removed) {
      setMessage(`Unable to remove file: ${error?.message ?? "Access denied."}`);
    } else {
      const { error: storageError } = await supabase.storage.from("course-materials").remove([file.storage_path]);
      if (storageError) setMessage("File removed from the course, but storage cleanup failed.");
      setFiles((previous) => previous.filter((item) => item.id !== file.id));
      router.refresh();
    }
    setSaving(false);
  }

  return <form onSubmit={(event) => { event.preventDefault(); void save(false); }} className="research-panel mt-8 space-y-7 p-6 lg:p-8">
    <div>
      <label htmlFor="course-title" className="mb-2 block text-sm font-semibold">Course name *</label>
      <input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={160}
        className="w-full rounded-xl border border-white/20 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400" placeholder="e.g. Analog CMOS IC Design" />
    </div>
    <div>
      <label htmlFor="course-description" className="mb-2 block text-sm font-semibold">Short description</label>
      <textarea id="course-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3}
        className="w-full rounded-xl border border-white/20 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400" />
    </div>

    <div>
      <label htmlFor="course-supplementary-url" className="mb-2 block text-sm font-semibold">Supplementary link (optional)</label>
      <input id="course-supplementary-url" type="url" value={supplementaryUrl}
        onChange={(event) => setSupplementaryUrl(event.target.value)} maxLength={2048}
        placeholder="https://..." className="w-full rounded-xl border border-white/20 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400" />
      <p className="mt-2 text-sm text-slate-400">Add a course website, repository, or external resource.</p>
    </div>

    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="course-readme" className="text-xl font-bold">Course README (optional)</label>
        <div className="flex gap-2 text-sm font-semibold">
          <button type="button" onClick={() => setPreviewReadme(false)}
            className={previewReadme ? "text-slate-400" : "text-cyan-300"}>Edit</button>
          <button type="button" onClick={() => setPreviewReadme(true)}
            className={previewReadme ? "text-cyan-300" : "text-slate-400"}>Preview</button>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-400">Paste Markdown or import README.md (up to 128 KB). Links to repository files use the GitHub repository in Supplementary link.</p>
      <input type="file" accept=".md,.markdown,text/markdown,text/plain" aria-label="Import README.md"
        className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400/15 file:px-4 file:py-2 file:font-semibold file:text-cyan-200"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!/\.(md|markdown)$/i.test(file.name) || file.size > maxReadmeSize) {
            setMessage("Choose a .md or .markdown file no larger than 128 KB."); return;
          }
          setReadmeMarkdown(await file.text());
          setPreviewReadme(true);
          setMessage("");
          event.target.value = "";
        }} />
      {previewReadme ? <div className="mt-4 min-h-44 rounded-xl border border-white/15 bg-slate-950/40 p-5">
        {readmeMarkdown.trim() ? <CourseReadme markdown={readmeMarkdown} repositoryUrl={supplementaryUrl} />
          : <p className="text-slate-400">README is empty. Switch to Edit to add Markdown.</p>}
      </div> : <textarea id="course-readme" value={readmeMarkdown}
        onChange={(event) => setReadmeMarkdown(event.target.value)} rows={12}
        placeholder="# Course Overview\n\nAdd lecture topics, tables, learning outcomes, and references."
        className="mt-4 w-full rounded-xl border border-white/20 bg-slate-950/80 px-4 py-3 font-mono text-sm outline-none focus:border-cyan-400" />}
    </div>

    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Video Lessons (optional)</h2>
        <button type="button" disabled={lessons.length >= 50} onClick={() => setLessons((current) => [...current, { title: "", video_url: "" }])}
          className="text-sm font-semibold text-cyan-300 disabled:opacity-50">+ Add lesson</button>
      </div>
      <div className="mt-4 space-y-4">{lessons.map((lesson, index) =>
        <div key={index} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex justify-between text-sm"><span>Lesson {index + 1}</span>
            <button type="button" onClick={() => setLessons((current) => current.filter((_, i) => i !== index))} className="text-red-300">Remove</button>
          </div>
          <input aria-label={`Lesson ${index + 1} title`} value={lesson.title} onChange={(event) => updateLesson(index, "title", event.target.value)}
            maxLength={160} placeholder="Lesson title" className="mt-3 w-full rounded-lg border border-white/20 bg-slate-950 p-3" />
          <input aria-label={`Lesson ${index + 1} video URL`} type="url" value={lesson.video_url} onChange={(event) => updateLesson(index, "video_url", event.target.value)}
            placeholder="https://... video link" className="mt-3 w-full rounded-lg border border-white/20 bg-slate-950 p-3" />
        </div>)}</div>
    </div>

    <div>
      <h2 className="text-xl font-bold">PDF & ZIP Materials (optional)</h2>
      <p className="mt-2 text-sm text-slate-400">Private files. Maximum 25 MB per file.</p>
      {files.length > 0 && <div className="mt-3 space-y-2">{files.map((file) =>
        <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-2 text-sm">
          <span className="truncate">{file.file_name}</span>
          <button type="button" disabled={saving} onClick={() => removeFile(file)} className="shrink-0 text-red-300 disabled:opacity-50">Remove</button>
        </div>)}</div>}
      <input type="file" accept=".pdf,.zip,application/pdf,application/zip" multiple
        onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))}
        className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400/15 file:px-4 file:py-2 file:font-semibold file:text-cyan-200" />
      {newFiles.length > 0 && <p className="mt-2 text-xs text-cyan-300">{newFiles.length} new file(s) selected for upload on save.</p>}
    </div>

    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)}
        className="mt-1 h-4 w-4 accent-cyan-400" />
      <span><strong className="block text-white">Visible to assigned subscribers</strong>
        <span className="mt-1 block text-sm text-slate-400">When disabled, only administrators and the course author can see this item—even if it is published.</span></span>
    </label>

    {message && <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
      {message} {draftId && <Link href={`/courses/${draftId}/edit`} className="underline">Open saved draft</Link>}
    </p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={saving} className="research-btn-secondary disabled:opacity-50">{saving ? "Saving..." : "Save Draft"}</button>
      <button type="button" disabled={saving} onClick={() => void save(true)}
        className="research-btn-primary disabled:opacity-50">{saving ? "Saving..." : "Publish Course"}</button>
    </div>
  </form>;
}
