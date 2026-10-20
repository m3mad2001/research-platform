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

  return <section className="research-panel mb-4 p-5" aria-label="Notifications">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="research-section-title">Notifications</p>
        <h2 className="mt-1 text-lg font-bold">Platform updates {unread > 0 && <span className="ml-2 rounded-full bg-cyan-400 px-2 py-0.5 text-xs text-slate-950">{unread}</span>}</h2></div>
      {unread > 0 && <button type="button" onClick={markAllRead} className="text-sm font-semibold text-cyan-300">Mark all read</button>}
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{notifications.slice(0, 4).map((item) =>
      <article key={item.id} className={`rounded-xl border p-4 ${item.read_at ? "border-white/10 bg-slate-950/30" : "border-cyan-400/30 bg-cyan-400/[0.07]"}`}>
        <h3 className="font-semibold text-white">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-300">{item.message}</p>
      </article>)}</div>
  </section>;
}
