"use client";

import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";
import { isSupabaseConfigured } from "../utils/supabase/config";

export default function PublicVisitCounter() {
  const [visits, setVisits] = useState<number | null>(null);
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    async function refresh() {
      const { data, error } = await supabase.rpc("get_site_visit_stats");
      if (!error && data) {
        setVisits(Number(data.site_visits));
        setSince(data.since || null);
      }
    }
    void refresh();
    window.addEventListener("platform-visit-updated", refresh);
    return () => window.removeEventListener("platform-visit-updated", refresh);
  }, []);

  if (visits === null) return null;

  return (
    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-4 text-center">
      <p className="text-sm text-slate-300">Platform visits</p>
      <p className="mt-1 text-2xl font-bold text-cyan-300">{visits.toLocaleString("en-US")}</p>
      {since && <p className="mt-1 text-xs text-slate-400">Since {new Date(since).toLocaleDateString("en-GB")}</p>}
    </div>
  );
}
