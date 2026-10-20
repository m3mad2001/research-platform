"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function DownloadCourseFile({ fileName, storagePath, sizeBytes, storageBucket = "course-materials" }: {
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  storageBucket?: "course-materials" | "silo-materials";
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setDownloading(true);
    setError("");
    try {
      // Supabase checks resource access against Storage RLS on every request.
      const { data, error: downloadError } = await createClient().storage
        .from(storageBucket).download(storagePath);
      if (downloadError || !data) throw downloadError ?? new Error("Download unavailable");
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError("Access denied or download unavailable. Refresh the page and try again.");
    } finally {
      setDownloading(false);
    }
  }

  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
    <div>
      <p className="text-sm font-semibold">{fileName}</p>
      <p className="text-xs text-slate-400">{(sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
    <button type="button" onClick={download} disabled={downloading} className="research-btn-secondary text-sm disabled:opacity-50">
      {downloading ? "Downloading..." : "Download"}
    </button>
  </div>;
}
