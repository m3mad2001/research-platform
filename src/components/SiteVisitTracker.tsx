"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { isSupabaseConfigured } from "../utils/supabase/config";

const STORAGE_KEY = "research_platform_visit_session";
const SESSION_TIMEOUT = 30 * 60 * 1000;

// A visit is one browser session, resumed until 30 minutes of inactivity.
export default function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const now = Date.now();
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as
        | { id: string; lastSeen: number }
        | null;
      const id = stored?.id && stored.lastSeen > now - SESSION_TIMEOUT && stored.lastSeen <= now
        ? stored.id
        : crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, lastSeen: now }));

      const supabase = createClient();
      void supabase.rpc("record_site_visit", {
        p_session_id: id,
        p_registration_page: pathname === "/register",
      }).then(({ error }) => {
        if (error) console.error("Visit tracking unavailable:", error);
        window.dispatchEvent(new Event("platform-visit-updated"));
      });
    } catch (error) {
      // Storage can be blocked by browser settings; analytics must never block navigation.
      console.error("Visit tracking unavailable:", error);
    }
  }, [pathname]);

  return null;
}
