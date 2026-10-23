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
    <div className="ax-visits">
      <span>Platform visits</span>
      <strong>{visits.toLocaleString("en-US")}</strong>
      {since && <span>· since {new Date(since).toLocaleDateString("en-GB")}</span>}
    </div>
  );
}
