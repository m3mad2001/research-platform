"use client";

import { useState } from "react";
import { createClient } from "../utils/supabase/client";

export type PlatformNotification = {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export default function NotificationCenter({ initialNotifications }: { initialNotifications: PlatformNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = notifications.filter((item) => !item.read_at).length;
  if (!notifications.length) return null;

  async function markAllRead() {
    const { error } = await createClient().rpc("mark_notification_read", { p_notification_id: null });
    if (!error) setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  }

    return <section className="ax-panel" aria-label="Notifications">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="ax-panel-head"><small>Notifications</small>
        <h2 style={{ fontSize: "1.125rem" }}>Platform updates {unread > 0 && <span className="ax-badge">{unread}</span>}</h2></div>
      {unread > 0 && <button type="button" onClick={markAllRead} className="ax-link-btn">Mark all read</button>}
    </div>
    <div className="ax-notif-grid">{notifications.slice(0, 4).map((item) =>
      <article key={item.id} className={`ax-notif${item.read_at ? "" : " is-unread"}`}>
        <h3>{item.title}</h3><p>{item.message}</p>
      </article>)}</div>
  </section>;
}
