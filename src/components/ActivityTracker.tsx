"use client";

import { useEffect } from "react";
import { createClient } from "../utils/supabase/client";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds
const IDLE_TIMEOUT = 5 * 60_000;   // 5 minutes

export default function ActivityTracker() {
  useEffect(() => {
    const supabase = createClient();

    let lastActivity = Date.now();

    function markActive() {
      lastActivity = Date.now();
    }

    // Detect real user activity
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActive, {
        passive: true,
      });
    });

    async function sendHeartbeat() {
      // Do not count time if browser tab is hidden
      if (document.visibilityState !== "visible") {
        return;
      }

      // Do not count time if user has been idle for 5+ minutes
      const idleDuration = Date.now() - lastActivity;

      if (idleDuration >= IDLE_TIMEOUT) {
        return;
      }

      const sessionId = localStorage.getItem(
        "platform_session_id"
      );

      if (!sessionId) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { error } = await supabase.rpc(
        "record_session_heartbeat",
        {
          p_session_id: sessionId,
          p_increment_seconds: 60,
        }
      );

      if (error) {
        console.error(
          "Heartbeat failed:",
          error
        );
      }
    }

    const heartbeatTimer = window.setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL
    );

    return () => {
      window.clearInterval(heartbeatTimer);

      activityEvents.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          markActive
        );
      });
    };
  }, []);

  return null;
}