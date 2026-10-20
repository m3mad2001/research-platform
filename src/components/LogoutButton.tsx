"use client";

import { useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();

    // Get current logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sessionId = localStorage.getItem(
      "platform_session_id"
    );

    if (user && sessionId) {
      const logoutTime = new Date().toISOString();

      // 1. Close the current platform session
      const { error: sessionError } = await supabase
        .from("user_sessions")
        .update({
          logout_at: logoutTime,
          last_seen_at: logoutTime,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (sessionError) {
        console.error(
          "Unable to close session:",
          sessionError
        );
      }

      // 2. Record logout event
      const { error: eventError } = await supabase
        .from("activity_events")
        .insert({
          user_id: user.id,
          session_id: sessionId,
          event_type: "logout",
          resource_type: "platform",
          resource_id: "main",
        });

      if (eventError) {
        console.error(
          "Unable to record logout event:",
          eventError
        );
      }
    }

    // 3. Remove local analytics session
    localStorage.removeItem("platform_session_id");

    // 4. Logout from Supabase Auth
    await supabase.auth.signOut();

    // 5. Return to login page
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-xl border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}