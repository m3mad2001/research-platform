import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "../../components/HealthTwinBrand";
import { createClient } from "../../utils/supabase/server";
import LogoutButton from "../../components/LogoutButton";
import { defaultResourceVisibility, type ResourceKey, type ResourceVisibilityMode } from "../../lib/resources";
import ResourceOpenLink from "../../components/ResourceOpenLink";
import { formatAccessExpiry, hasActiveAccess, hasNoExpiry, remainingAccessDays } from "../../lib/access-policy";
import NotificationCenter, { type PlatformNotification } from "../../components/NotificationCenter";
import { Icon, type IconName } from "../../components/AxIcon";

type Tracked = "courses" | "software" | "silo";
type ResourceCardDef = {
  key: ResourceKey; title: string; description: string; icon: IconName;
  href?: string; action?: string; track?: Tracked;
};

const resourceCards: ResourceCardDef[] = [
  { key: "courses", title: "Courses", icon: "book", href: "/courses", action: "Browse courses", track: "courses",
    description: "Structured engineering courses, tutorials, videos, PDFs, and practical laboratories." },
  { key: "hemox", title: "HEMOX Research Suite", icon: "wave",
    description: "Wearable physiological sensing, synchronized acquisition, visualization, validation, and research analysis." },
  { key: "software", title: "Software & APK", icon: "code", href: "#software", action: "View downloads", track: "software",
    description: "Android applications, engineering software, scripts, and versioned releases." },
  { key: "firmware", title: "Firmware", icon: "chip",
    description: "Embedded firmware releases, documentation, configuration files, and device resources." },
  { key: "explorers", title: "Interactive Explorers", icon: "compass",
    description: "Browser-based tools for visualization, signal analysis, validation, and reporting." },
  { key: "datasets", title: "Datasets", icon: "db",
    description: "Approved research datasets, example recordings, validation material, and technical resources." },
  { key: "silo", title: "SILO: Simulator-in-the-Loop Analog/RFIC Design", icon: "chip", href: "/silo", action: "Explore SILO", track: "silo",
    description: "Spectre-in-the-Loop RFIC design: research artifact, documentation, reports, and optional data." },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const noticeValue = (await searchParams).notice;
  const notice = Array.isArray(noticeValue) ? noticeValue[0] : noticeValue;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, institution, intended_use, role, status, approved_at, expires_at")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) redirect("/login");

  if (profile.role === "admin" && profile.status === "approved") redirect("/admin");
  if (profile.role !== "user" || profile.status !== "approved") redirect("/login");
  if (!hasActiveAccess(profile)) redirect("/login");
  const remainingDays = remainingAccessDays(profile.expires_at);

  const { data: accessRows, error: accessError } = await supabase
    .from("user_resource_access").select("resource_key").eq("user_id", user.id);
  // A failed permission lookup must never make a resource available.
  const granted = new Set<ResourceKey>(
    accessError ? [] : (accessRows ?? []).map((row) => row.resource_key as ResourceKey)
  );
  const { data: resourceCounts, error: countsError } = await supabase.rpc("get_resource_visit_counts");
  const visitCounts = countsError ? null : (resourceCounts as Record<string, number> | null);
  const [{ data: visibilityRows }, { data: notificationRows }] = await Promise.all([
    supabase.from("resource_visibility").select("resource_key,display_mode"),
    supabase.from("user_notifications").select("id,title,message,read_at,created_at")
      .order("created_at", { ascending: false }).limit(6),
  ]);
  const visibility = { ...defaultResourceVisibility };
  for (const row of visibilityRows ?? []) {
    visibility[row.resource_key as ResourceKey] = row.display_mode as ResourceVisibilityMode;
  }
  const isCardAvailable = (key: ResourceKey) => visibility[key] !== "hidden";
  const shouldShowCard = (key: ResourceKey) =>
    visibility[key] === "locked" || (visibility[key] === "visible" && granted.has(key));
  const canSee = (key: ResourceKey) => granted.has(key) && isCardAvailable(key);

  const navItems = ([
    { label: "Dashboard", href: "/dashboard", icon: "home", show: true, current: true },
    { label: "Discussions", href: "/discussions", icon: "chat", show: true },
    { label: "Courses", href: "/courses", icon: "book", show: canSee("courses") },
    { label: "HEMOX Suite", href: "#resources", icon: "wave", show: canSee("hemox") },
    { label: "Software & APK", href: "#software", icon: "code", show: canSee("software") },
    { label: "Firmware", href: "#resources", icon: "chip", show: canSee("firmware") },
    { label: "Explorers", href: "#resources", icon: "compass", show: canSee("explorers") },
    { label: "Datasets", href: "#resources", icon: "db", show: canSee("datasets") },
    { label: "SILO", href: "/silo", icon: "chip", show: canSee("silo") },
    { label: "Contact", href: "/contact", icon: "mail", show: true },
  ] satisfies Array<{ label: string; href: string; icon: IconName; show: boolean; current?: boolean }>).filter((item) => item.show);

  return (
    <main className="apple-home ax-dash">
      <header className="ax-nav">
        <div className="ax-container ax-nav-inner" style={{ width: "min(1280px, calc(100% - 2rem))" }}>
          <BrandLockup compact />
          <div className="ax-actions">
            <Link href="/" className="ax-btn ax-btn-secondary ax-btn-sm">Platform Home</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <nav className="ax-chips" aria-label="Workspace navigation">
        {navItems.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
      </nav>

      <div className="ax-dash-shell">
        <aside className="ax-side" aria-label="Workspace navigation">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} aria-current={item.current ? "page" : undefined}>
              <Icon name={item.icon} />{item.label}
            </Link>
          ))}
        </aside>

        <div className="ax-dash-main">
          {notice === "silo-setup-required" && (
            <div role="alert" className="ax-banner ax-banner-warn">
              <strong>SILO database setup is incomplete</strong>
              Ask the administrator to run <code>scripts/silo-and-reports.sql</code> in the Supabase SQL Editor, then refresh this page.
            </div>
          )}
          {notice === "silo-access-required" && (
            <div role="alert" className="ax-banner ax-banner-info">
              <strong>SILO access is not assigned</strong>
              An administrator must enable the SILO resource for this account from Manage Access.
            </div>
          )}

          <section className="ax-welcome">
            <p className="ax-eyebrow">Research access</p>
            <h1 style={{ marginTop: ".4rem" }}>Welcome, {profile.full_name || "Researcher"}</h1>
            <p>Your engineering courses, research software, firmware, datasets, explorers, and HEMOX tools.</p>
          </section>

          <Link href="/discussions" className="ax-panel ax-row-link">
            <span>
              <strong>Research Discussions</strong>
              <p>Ask a question, follow research conversations, and share answers.</p>
            </span>
            <span className="ax-more">Explore discussions ›</span>
          </Link>

          <NotificationCenter initialNotifications={(notificationRows ?? []) as PlatformNotification[]} />

          <section className="ax-stats" aria-label="Access summary">
            <div className="ax-stat"><small><span className="ax-dot" />Access status</small><strong>Active</strong></div>
            <div className="ax-stat"><small>Days remaining</small>
              <strong>{hasNoExpiry(profile.expires_at) ? "Unlimited" : String(remainingDays ?? 0)}</strong></div>
            <div className="ax-stat"><small>Approved</small><strong>{formatDate(profile.approved_at)}</strong></div>
            <div className="ax-stat"><small>Expires</small>
              <strong style={{ fontSize: "1.0625rem" }}>{formatAccessExpiry(profile.expires_at)}</strong></div>
          </section>

          <section className="ax-panel ax-fields" aria-label="Account">
            <div className="ax-field"><Icon name="mail" /><span><small>Email</small><span className="v">{profile.email || "—"}</span></span></div>
            <div className="ax-field"><Icon name="building" /><span><small>Institution</small><span className="v">{profile.institution || "—"}</span></span></div>
            <div className="ax-field"><Icon name="target" /><span><small>Intended use</small><span className="v">{profile.intended_use || "—"}</span></span></div>
          </section>

          <section id="resources" className="ax-panel ax-anchor">
            <div className="ax-panel-head">
              <small>My platform</small>
              <h2>Research &amp; Learning Resources</h2>
              <p>Your approved resources are available from this dashboard.</p>
            </div>
            <div className="ax-rgrid">
              {resourceCards.filter((card) => shouldShowCard(card.key)).map((card) => {
                const allowed = granted.has(card.key);
                const count = card.track && visitCounts ? Number(visitCounts[card.track] ?? 0) : undefined;
                return (
                  <article key={card.key} className={`ax-rcard${allowed ? "" : " is-locked"}`}>
                    {allowed && card.href && card.track && (
                      <ResourceOpenLink resourceKey={card.track} href={card.href}
                        ariaLabel={`Open ${card.title}`} className="ax-rcard-link">
                        <span className="sr-only">Open {card.title}</span>
                      </ResourceOpenLink>
                    )}
                    <Icon name={card.icon} />
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    {allowed && card.href && count !== undefined && (
                      <span className="ax-count">Opened {count.toLocaleString("en-US")} times</span>
                    )}
                    {!allowed ? <span className="ax-pill">Access not assigned</span>
                      : card.href ? <span className="ax-more">{card.action ?? "View"} ›</span>
                      : <span className="ax-pill">Coming next</span>}
                  </article>
                );
              })}
            </div>
          </section>

          {canSee("software") && (
            <section id="software" className="ax-panel ax-anchor">
              <div className="ax-panel-head"><small>Software &amp; APK</small><h2>Available Downloads</h2></div>
              <div className="ax-download">
                <div className="l">
                  <Icon name="code" />
                  <div>
                    <strong>HEMOX Android App</strong>
                    <small>Version 1.3.7.1 · Android APK · HEMOXV1.3.7.1.apk · 554 KB</small>
                  </div>
                </div>
                <a href="/api/software/hemox/download" className="ax-btn ax-btn-primary">Download APK</a>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh", day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(value));
}